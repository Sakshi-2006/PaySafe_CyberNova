import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Sparkles, ShieldCheck, Globe2, Clock3, ShieldAlert } from 'lucide-react';
import { AnalysisPipeline } from '@/components/AnalysisPipeline';
import { RiskResultPanel } from '@/components/RiskResultPanel';
import type { RiskResult } from '@/lib/riskEngine';
import { useToast } from '@/context/ToastContext';

const API_BASE = (import.meta.env.VITE_FRAUD_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const PIPELINE_STEPS = [
  { icon: Link2, label: 'Parsing URL structure' },
  { icon: Globe2, label: 'Resolving live domain registration data' },
  { icon: ShieldAlert, label: 'Checking live reputation signals' },
  { icon: Clock3, label: 'Evaluating domain age and HTTPS' },
  { icon: ShieldCheck, label: 'Calculating combined risk' },
];

type Phase = 'input' | 'analyzing' | 'result';

export function LinkAnalyzerPage() {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [result, setResult] = useState<RiskResult | null>(null);

  const handleAnalyze = () => {
    if (!url.trim()) {
      toast('Please enter a URL to analyze', 'warning');
      return;
    }
    try {
      new URL(url.trim());
    } catch {
      toast('Enter a valid URL, including https://', 'warning');
      return;
    }
    setPhase('analyzing');
  };

  const handleComplete = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/analyze-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.detail || 'Link analysis failed');
      const res: RiskResult = {
        ...payload.riskResult,
        inputPreview: url.trim(),
        inputType: 'url',
        timestamp: new Date().toISOString(),
      };
      setResult(res);
      setPhase('result');
      toast('Live link analysis complete');
    } catch (error) {
      setPhase('input');
      toast(error instanceof Error ? error.message : 'Live link analysis failed', 'error');
    }
  };

  const handleReset = () => {
    setUrl('');
    setResult(null);
    setPhase('input');
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center"><Link2 className="w-5 h-5 text-cyan-glow" /></div>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold text-white">Payment Link Analyzer</h1>
        </div>
        <p className="text-gray-400">Inspect suspicious payment URLs using live domain registration and reputation signals.</p>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'input' && (
          <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass-panel p-6 lg:p-8">
            <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">Payment URL</label>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/payment" className="input-field font-mono" />
            <button onClick={handleAnalyze} className="btn-primary mt-5"><Sparkles className="w-4 h-4" /> Analyze Link</button>
          </motion.div>
        )}
        {phase === 'analyzing' && <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><AnalysisPipeline onComplete={handleComplete} steps={PIPELINE_STEPS} /></motion.div>}
        {phase === 'result' && result && <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><RiskResultPanel result={result} onAnalyzeAnother={handleReset} label="Link Analysis" /></motion.div>}
      </AnimatePresence>
    </div>
  );
}
