import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Sparkles, Upload, Camera, ScanLine, UserCheck, ShieldCheck } from 'lucide-react';
import { AnalysisPipeline } from '@/components/AnalysisPipeline';
import { RiskResultPanel } from '@/components/RiskResultPanel';
import type { RiskResult } from '@/lib/riskEngine';
import { useToast } from '@/context/ToastContext';

const API_BASE = (import.meta.env.VITE_FRAUD_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const PIPELINE_STEPS = [
  { icon: ScanLine, label: 'Decoding QR payload' },
  { icon: QrCode, label: 'Extracting UPI payment fields' },
  { icon: UserCheck, label: 'Verifying UPI handle and recipient signals' },
  { icon: ShieldCheck, label: 'Calculating payment risk' },
];

type Phase = 'input' | 'analyzing' | 'result';

interface QRData { upiId: string; recipientName: string; amount: number; note: string; }

function parseUpiPayload(raw: string): QRData {
  const value = raw.trim();
  if (!value.toLowerCase().startsWith('upi://pay')) {
    throw new Error('The QR does not contain a UPI payment payload.');
  }
  const url = new URL(value);
  const params = url.searchParams;
  return {
    upiId: params.get('pa') || '',
    recipientName: params.get('pn') || '',
    amount: Number(params.get('am') || 0),
    note: params.get('tn') || '',
  };
}

export function QrAnalyzerPage() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [rawPayload, setRawPayload] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [result, setResult] = useState<RiskResult | null>(null);
  const [scanning, setScanning] = useState(false);

  const decodeBitmap = async (source: ImageBitmapSource) => {
    const bitmap = await createImageBitmap(source as ImageBitmapSource);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not prepare the QR image for decoding.');
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
    bitmap.close();
    if (!code?.data) throw new Error('No QR code was detected in the image.');
    setRawPayload(code.data);
    setQrData(parseUpiPayload(code.data));
  };

  const handleUpload = async (file: File) => {
    try {
      await decodeBitmap(file);
      toast('QR decoded successfully');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'QR decoding failed', 'error');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const handleCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not available in this browser. Open PaySafe over HTTPS in Chrome or Edge.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setScanning(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (error) {
      stopCamera();
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        toast('Camera permission was blocked. Click the camera icon in the address bar, allow Camera for PaySafe, then try again.', 'error');
      } else if (name === 'NotFoundError') {
        toast('No camera was found on this device.', 'error');
      } else if (name === 'NotReadableError') {
        toast('The camera is already being used by another application.', 'error');
      } else {
        toast(error instanceof Error ? error.message : 'Camera access failed', 'error');
      }
    }
  };

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    let animationId = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scan = () => {
      if (cancelled || !streamRef.current || !videoRef.current || !ctx) return;
      const video = videoRef.current;
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
        if (code?.data) {
          cancelled = true;
          setRawPayload(code.data);
          try {
            setQrData(parseUpiPayload(code.data));
            stopCamera();
            toast('QR decoded successfully');
          } catch (error) {
            stopCamera();
            toast(error instanceof Error ? error.message : 'Invalid UPI QR payload', 'error');
          }
          return;
        }
      }
      animationId = requestAnimationFrame(scan);
    };
    animationId = requestAnimationFrame(scan);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationId);
    };
  }, [scanning, toast]);


  const handleAnalyze = () => {
    if (!qrData?.upiId) {
      toast('Decode a UPI QR first', 'warning');
      return;
    }
    setPhase('analyzing');
  };

  const handleComplete = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/verify-upi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qrData),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || 'UPI verification failed');
      const res: RiskResult = {
        ...payload.riskResult,
        inputType: 'qr',
        inputPreview: `UPI: ${qrData!.upiId}, Amount: ₹${qrData!.amount}, Recipient: ${qrData!.recipientName || 'Not provided'}`,
        timestamp: new Date().toISOString(),
      };
      setResult(res);
      setPhase('result');
      toast('UPI verification complete');
    } catch (error) {
      setPhase('input');
      toast(error instanceof Error ? error.message : 'UPI verification failed', 'error');
    }
  };

  const handleReset = () => {
    stopCamera();
    setQrData(null);
    setRawPayload('');
    setResult(null);
    setPhase('input');
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center"><QrCode className="w-5 h-5 text-cyan-glow" /></div>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold text-white">QR Code Analyzer</h1>
        </div>
        <p className="text-gray-400">Decode a real UPI QR payload and verify its payment details before sending money.</p>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'input' && (
          <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
            <div className="glass-panel p-6 lg:p-8">
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              <div className="relative w-full max-w-sm mx-auto aspect-square bg-ink-950 rounded-2xl border-2 border-dashed border-cyan/20 flex items-center justify-center overflow-hidden">
                {scanning ? (
                  <div className="relative w-full h-full">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    <motion.div className="absolute left-4 right-4 h-0.5 bg-cyan-glow shadow-glow" animate={{ top: ['15%', '85%', '15%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
                  </div>
                ) : qrData ? (
                  <div className="text-center p-6">
                    <QrCode className="w-16 h-16 text-cyan-glow mx-auto mb-3" />
                    <p className="font-mono text-sm text-cyan-glow break-all">{qrData.upiId}</p>
                    <p className="text-xs text-gray-500 mt-2">Live payload decoded</p>
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <QrCode className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Upload or scan a UPI QR code</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-5">
                <button onClick={() => inputRef.current?.click()} className="btn-secondary"><Upload className="w-4 h-4" /> Upload QR Image</button>
                <button onClick={handleCamera} className="btn-secondary"><Camera className="w-4 h-4" /> Camera Scan</button>
              </div>
            </div>

            {qrData && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6">
                <h3 className="text-sm font-heading font-semibold text-white mb-4">Decoded UPI Payload</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">UPI ID</p><p className="font-mono text-sm text-white break-all">{qrData.upiId}</p></div>
                  <div><p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Recipient Name</p><p className="text-sm text-white">{qrData.recipientName || 'Not provided'}</p></div>
                  <div><p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Amount</p><p className="font-mono text-sm text-white">₹{qrData.amount.toLocaleString('en-IN')}</p></div>
                  <div><p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Payment Note</p><p className="text-sm text-white">{qrData.note || 'Not provided'}</p></div>
                </div>
                <details className="mt-4"><summary className="text-xs text-gray-500 cursor-pointer">View raw QR payload</summary><p className="mt-2 p-3 rounded-lg bg-ink-900 text-xs font-mono text-gray-300 break-all">{rawPayload}</p></details>
                <button onClick={handleAnalyze} className="btn-primary mt-5"><Sparkles className="w-4 h-4" /> Verify UPI Risk</button>
              </motion.div>
            )}
          </motion.div>
        )}
        {phase === 'analyzing' && <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><AnalysisPipeline onComplete={handleComplete} steps={PIPELINE_STEPS} /></motion.div>}
        {phase === 'result' && result && <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><RiskResultPanel result={result} onAnalyzeAnother={handleReset} label="QR Analysis" /></motion.div>}
      </AnimatePresence>
    </div>
  );
}
