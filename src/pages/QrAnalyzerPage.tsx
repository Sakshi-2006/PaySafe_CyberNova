import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Sparkles, FileText, Upload, Camera, ScanLine } from 'lucide-react';
import { AnalysisPipeline } from '@/components/AnalysisPipeline';
import { RiskResultPanel } from '@/components/RiskResultPanel';
import { analyzeQR, type RiskResult, type QRData } from '@/lib/riskEngine';
import { DEMO_QR } from '@/lib/storage';
import { useToast } from '@/context/ToastContext';

const PIPELINE_STEPS = [
  { icon: ScanLine, label: 'Decoding QR data' },
  { icon: QrCode, label: 'Extracting UPI information' },
  { icon: FileText, label: 'Checking recipient details' },
  { icon: Sparkles, label: 'Analyzing payment amount' },
  { icon: ScanLine, label: 'Evaluating transaction history' },
  { icon: FileText, label: 'Generating risk report' },
];

type Phase = 'input' | 'analyzing' | 'result';

export function QrAnalyzerPage() {
  const { toast } = useToast();
  const [qrData, setQrData] = useState<QRData>({ upiId: '', recipientName: '', amount: 0, note: '' });
  const [phase, setPhase] = useState<Phase>('input');
  const [result, setResult] = useState<RiskResult | null>(null);
  const [scanning, setScanning] = useState(false);

  const handleDemo = () => {
    setQrData(DEMO_QR);
    toast('Demo QR data loaded');
  };

  const handleUpload = () => {
    toast('QR image upload is a prototype feature. Using demo data.');
    setQrData(DEMO_QR);
  };

  const handleCamera = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setQrData(DEMO_QR);
      toast('QR scanned (demo data)');
    }, 2000);
  };

  const handleAnalyze = () => {
    if (!qrData.upiId.trim()) {
      toast('Please load QR data or use demo', 'warning');
      return;
    }
    setPhase('analyzing');
  };

  const handleComplete = () => {
    const res = analyzeQR(qrData);
    setResult(res);
    setPhase('result');
    toast('QR analysis complete');
  };

  const handleReset = () => {
    setQrData({ upiId: '', recipientName: '', amount: 0, note: '' });
    setResult(null);
    setPhase('input');
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-cyan-glow" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold text-white">QR Code Analyzer</h1>
        </div>
        <p className="text-gray-400">Inspect payment QR information before sending money.</p>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            {/* Scan area */}
            <div className="glass-panel p-6 lg:p-8">
              <div className="relative w-full max-w-sm mx-auto aspect-square bg-ink-950 rounded-2xl border-2 border-dashed border-cyan/20 flex items-center justify-center overflow-hidden">
                {scanning ? (
                  <>
                    <QrCode className="w-24 h-24 text-cyan/20" />
                    <motion.div
                      className="absolute left-0 right-0 h-0.5 bg-cyan-glow shadow-glow"
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </>
                ) : qrData.upiId ? (
                  <div className="text-center p-6">
                    <QrCode className="w-16 h-16 text-cyan-glow mx-auto mb-3" />
                    <p className="font-mono text-sm text-cyan-glow">{qrData.upiId}</p>
                  </div>
                ) : (
                  <div className="text-center p-6">
                    <QrCode className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Upload or scan a QR code</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-5">
                <button onClick={handleUpload} className="btn-secondary">
                  <Upload className="w-4 h-4" /> Upload QR Image
                </button>
                <button onClick={handleCamera} className="btn-secondary">
                  <Camera className="w-4 h-4" /> Camera Scan
                </button>
                <button onClick={handleDemo} className="btn-secondary">
                  <FileText className="w-4 h-4" /> Use Demo QR
                </button>
              </div>
            </div>

            {/* QR data preview */}
            {qrData.upiId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-6"
              >
                <h3 className="text-sm font-heading font-semibold text-white mb-4">Extracted QR Data</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">UPI ID</p>
                    <p className="font-mono text-sm text-white">{qrData.upiId}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Recipient Name</p>
                    <p className="font-body text-sm text-white">{qrData.recipientName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Amount</p>
                    <p className="font-mono text-sm text-white">₹{qrData.amount.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Payment Note</p>
                    <p className="font-body text-sm text-white">{qrData.note}</p>
                  </div>
                </div>
                <button onClick={handleAnalyze} className="btn-primary mt-5">
                  <Sparkles className="w-4 h-4" /> Analyze QR Risk
                </button>
              </motion.div>
            )}

            <div className="p-3 rounded-xl bg-caution/5 border border-caution/20 flex items-start gap-2">
              <ScanLine className="w-4 h-4 text-caution shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400">
                This prototype does not perform actual UPI verification. QR decoding uses demo data for demonstration.
                Always verify recipients through official banking channels.
              </p>
            </div>
          </motion.div>
        )}

        {phase === 'analyzing' && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AnalysisPipeline onComplete={handleComplete} steps={PIPELINE_STEPS} />
          </motion.div>
        )}

        {phase === 'result' && result && (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <RiskResultPanel result={result} onAnalyzeAnother={handleReset} label="QR Analysis" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
