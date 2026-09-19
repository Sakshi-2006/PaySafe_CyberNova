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
  { icon: ScanLine, label: 'Decoding payment QR payload' },
  { icon: QrCode, label: 'Extracting payment details' },
  { icon: UserCheck, label: 'Verifying merchant and payment signals' },
  { icon: ShieldCheck, label: 'Calculating payment risk' },
];

type Phase = 'input' | 'analyzing' | 'result';
type PaymentNetwork = 'UPI' | 'DuitNow' | 'EMV_PAYMENT_QR';

interface QRData {
  network: PaymentNetwork;
  paymentAddress: string;
  upiId: string;
  recipientName: string;
  amount: number;
  currency: string;
  note: string;
  merchantCity: string;
  country: string;
  reference: string;
}

interface ParsedTLV {
  id: string;
  value: string;
}

function parseTLV(payload: string): ParsedTLV[] {
  const fields: ParsedTLV[] = [];
  let offset = 0;

  while (offset + 4 <= payload.length) {
    const id = payload.slice(offset, offset + 2);
    const lengthText = payload.slice(offset + 2, offset + 4);
    const length = Number.parseInt(lengthText, 10);

    if (!/^\d{2}$/.test(id) || !Number.isFinite(length) || offset + 4 + length > payload.length) {
      break;
    }

    fields.push({ id, value: payload.slice(offset + 4, offset + 4 + length) });
    offset += 4 + length;
  }

  return fields;
}

function tlvMap(fields: ParsedTLV[]): Map<string, string> {
  return new Map(fields.map((field) => [field.id, field.value]));
}

function parseEmvPaymentQr(raw: string): QRData | null {
  const value = raw.trim();
  if (!/^\d{4}/.test(value)) return null;

  const fields = parseTLV(value);
  if (!fields.length || fields[0].id !== '00') return null;

  const root = tlvMap(fields);
  const currencyCode = root.get('53') || '';
  const country = root.get('58') || '';
  const merchantName = root.get('59') || '';
  const merchantCity = root.get('60') || '';
  const amountText = root.get('54') || '';

  // DuitNow uses MY / 458. Keep the parser generic enough to recognize
  // other EMV payment QR payloads too, while identifying this one correctly.
  const isDuitNow = country.toUpperCase() === 'MY' || currencyCode === '458';
  const network: PaymentNetwork = isDuitNow ? 'DuitNow' : 'EMV_PAYMENT_QR';

  if (!merchantName && !merchantCity && !currencyCode) return null;

  let reference = '';
  const additional = root.get('62');
  if (additional) {
    const additionalFields = tlvMap(parseTLV(additional));
    reference = additionalFields.get('05') || additionalFields.get('08') || '';
  }

  const amount = amountText ? Number.parseFloat(amountText) : 0;

  return {
    network,
    paymentAddress: reference || merchantName,
    upiId: '',
    recipientName: merchantName,
    amount: Number.isFinite(amount) ? amount : 0,
    currency: currencyCode === '458' ? 'MYR' : currencyCode || '—',
    note: additionalFieldsSafeNote(root.get('62')),
    merchantCity,
    country,
    reference,
  };
}

function additionalFieldsSafeNote(raw: string | undefined): string {
  if (!raw) return '';
  const fields = tlvMap(parseTLV(raw));
  return fields.get('08') || fields.get('05') || '';
}

function parsePaymentPayload(raw: string): QRData {
  const value = raw.trim();

  // Some merchant QR codes encode a payment web URL rather than the
  // EMV/UPI payload directly. Keep the decoded URL instead of rejecting it.
  if (/^https?:\\/\\//i.test(value)) {
    let host = '';
    try { host = new URL(value).hostname; } catch {}
    return {
      network: 'EMV_PAYMENT_QR',
      paymentAddress: value,
      upiId: '',
      recipientName: '',
      amount: 0,
      currency: '—',
      note: '',
      merchantCity: '',
      country: '',
      reference: host || value,
    };
  }

  // Standard Indian UPI deep-link QR.
  let params: URLSearchParams | null = null;
  try {
    const url = new URL(value);
    const protocol = url.protocol.toLowerCase();
    const host = url.hostname.toLowerCase();

    if ((protocol === 'upi:' && host === 'pay') || protocol === 'upi:') {
      params = url.searchParams;
    } else if (url.searchParams.has('pa')) {
      params = url.searchParams;
    }
  } catch {
    // Try a plain query-string representation below.
  }

  if (!params) {
    const queryStart = value.indexOf('?');
    const query = queryStart >= 0 ? value.slice(queryStart + 1) : value;
    const candidate = new URLSearchParams(query);
    if (candidate.has('pa')) params = candidate;
  }

  const upiId = params?.get('pa')?.trim() || '';
  if (upiId && upiId.includes('@')) {
    const currency = params?.get('cu')?.trim().toUpperCase() || 'INR';
    const amount = Number(params?.get('am') || 0);
    return {
      network: 'UPI',
      paymentAddress: upiId,
      upiId,
      recipientName: params?.get('pn')?.trim() || '',
      amount: Number.isFinite(amount) ? amount : 0,
      currency,
      note: params?.get('tn')?.trim() || '',
      merchantCity: '',
      country: 'IN',
      reference: params?.get('tr')?.trim() || '',
    };
  }

  // BharatQR and other EMV-based payment QR profiles use a TLV payload.
  const emv = parseEmvPaymentQr(value);
  if (emv) return emv;

  throw new Error('QR code detected, but its payment format could not be recognized.');
}

async function decodeWithNativeDetector(source: ImageBitmapSource): Promise<string | null> {
  try {
    const Detector = (window as typeof window & {
      BarcodeDetector?: new (options?: { formats?: string[] }) => {
        detect(source: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>;
      };
    }).BarcodeDetector;
    if (!Detector) return null;
    const detector = new Detector({ formats: ['qr_code'] });
    const results = await detector.detect(source);
    return results.find((item) => item.rawValue)?.rawValue || null;
  } catch {
    return null;
  }
}

function decodeImageData(imageData: ImageData): string | null {
  const attempts: ImageData[] = [imageData];
  const gray = new Uint8ClampedArray(imageData.data);

  for (let i = 0; i < gray.length; i += 4) {
    const luminance = Math.round(0.299 * gray[i] + 0.587 * gray[i + 1] + 0.114 * gray[i + 2]);
    gray[i] = luminance;
    gray[i + 1] = luminance;
    gray[i + 2] = luminance;
  }
  attempts.push(new ImageData(gray, imageData.width, imageData.height));

  for (const attempt of attempts) {
    const code = jsQR(attempt.data, attempt.width, attempt.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code?.data) return code.data;
  }

  return null;
}

async function decodeSource(source: ImageBitmapSource): Promise<string> {
  const nativePayload = await decodeWithNativeDetector(source);
  if (nativePayload) return nativePayload;

  const bitmap = await createImageBitmap(source);
  try {
    const scale = Math.max(1, Math.min(3, 1600 / Math.max(bitmap.width, bitmap.height)));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not prepare the QR image for decoding.');

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bitmap, 0, 0, width, height);

    let payload = decodeImageData(ctx.getImageData(0, 0, width, height));
    if (payload) return payload;

    const cropWidth = Math.round(width * 0.8);
    const cropHeight = Math.round(height * 0.8);
    const cropX = Math.round((width - cropWidth) / 2);
    const cropY = Math.round((height - cropHeight) / 2);
    payload = decodeImageData(ctx.getImageData(cropX, cropY, cropWidth, cropHeight));
    if (payload) return payload;

    throw new Error('No QR code was detected in the image. Make sure the entire QR is visible, sharp and not heavily cropped.');
  } finally {
    bitmap.close();
  }
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

  const handleUpload = async (file: File) => {
    try {
      const payload = await decodeSource(file);
      setRawPayload(payload);
      setQrData(parsePaymentPayload(payload));
      toast('Payment QR decoded successfully');
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
        // Prefer the browser's native QR decoder when available. Chrome/Edge
        // can decode the complete QR payload directly from the camera frame.
        let nativePayload: string | null = null;
        const Detector = (window as typeof window & {
          BarcodeDetector?: new (options?: { formats?: string[] }) => {
            detect(source: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>;
          };
        }).BarcodeDetector;
        if (Detector) {
          try {
            const frame = await createImageBitmap(video);
            const detector = new Detector({ formats: ['qr_code'] });
            const detected = await detector.detect(frame);
            nativePayload = detected.find((item) => item.rawValue)?.rawValue || null;
            frame.close();
          } catch {}
        }

        if (nativePayload) {
          cancelled = true;
          setRawPayload(nativePayload);
          try {
            setQrData(parsePaymentPayload(nativePayload));
            stopCamera();
            toast('Payment QR decoded successfully');
          } catch (error) {
            stopCamera();
            toast(error instanceof Error ? error.message : 'Payment QR parsing failed', 'error');
          }
          return;
        }

        const scale = Math.min(1, 1280 / video.videoWidth);
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const payload = decodeImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));

        if (payload) {
          cancelled = true;
          setRawPayload(payload);

          try {
            setQrData(parsePaymentPayload(payload));
            stopCamera();
            toast('Payment QR decoded successfully');
          } catch (error) {
            stopCamera();
            toast(error instanceof Error ? error.message : 'Payment QR parsing failed', 'error');
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
    if (!qrData) {
      toast('Decode a payment QR first', 'warning');
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
      if (!response.ok) throw new Error(payload?.detail || 'Payment verification failed');

      const res: RiskResult = {
        ...payload.riskResult,
        inputType: 'qr',
        inputPreview: `${qrData.network}: ${qrData.paymentAddress || qrData.recipientName}, Amount: ${qrData.currency} ${qrData.amount || 'Open'}, Recipient: ${qrData.recipientName || 'Not provided'}`,
        timestamp: new Date().toISOString(),
      };
      setResult(res);
      setPhase('result');
      toast('Payment verification complete');
    } catch (error) {
      setPhase('input');
      toast(error instanceof Error ? error.message : 'Payment verification failed', 'error');
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
        <p className="text-gray-400">Decode UPI and supported payment-network QR codes and verify their payment details before sending money.</p>
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
                    <p className="text-xs uppercase tracking-wider text-cyan-glow mb-1">{qrData.network}</p>
                    <p className="font-mono text-sm text-white break-all">{qrData.paymentAddress || qrData.recipientName}</p>
                    <p className="text-xs text-gray-500 mt-2">Payment payload decoded</p>
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <QrCode className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Upload or scan a payment QR code</p>
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
                <h3 className="text-sm font-heading font-semibold text-white mb-4">Decoded Payment Payload</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Payment Network</p><p className="text-sm text-white">{qrData.network}</p></div>
                  <div><p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Recipient / Merchant</p><p className="text-sm text-white">{qrData.recipientName || 'Not provided'}</p></div>
                  <div><p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Payment Address / Reference</p><p className="font-mono text-sm text-white break-all">{qrData.paymentAddress || 'Not provided'}</p></div>
                  <div><p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Amount</p><p className="font-mono text-sm text-white">{qrData.amount ? `${qrData.currency} ${qrData.amount.toLocaleString('en-IN')}` : 'Amount entered at payment'}</p></div>
                  <div><p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Currency</p><p className="text-sm text-white">{qrData.currency}</p></div>
                  <div><p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Merchant City</p><p className="text-sm text-white">{qrData.merchantCity || 'Not provided'}</p></div>
                  <div><p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Country</p><p className="text-sm text-white">{qrData.country || 'Not provided'}</p></div>
                  <div><p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Reference / Note</p><p className="text-sm text-white">{qrData.reference || qrData.note || 'Not provided'}</p></div>
                </div>
                <details className="mt-4"><summary className="text-xs text-gray-500 cursor-pointer">View raw QR payload</summary><p className="mt-2 p-3 rounded-lg bg-ink-900 text-xs font-mono text-gray-300 break-all">{rawPayload}</p></details>
                <button onClick={handleAnalyze} className="btn-primary mt-5"><Sparkles className="w-4 h-4" /> Verify Payment Risk</button>
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
