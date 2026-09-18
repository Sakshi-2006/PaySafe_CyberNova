import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Sparkles, FileText, ShieldCheck } from 'lucide-react';
import { AnalysisPipeline } from '@/components/AnalysisPipeline';
import { RiskResultPanel } from '@/components/RiskResultPanel';
import { analyzeURL, type RiskResult } from '@/lib/riskEngine';
import { DEMO_LINK } from '@/lib/storage';
import { useToast } from '@/context/ToastContext';

const PIPELINE_STEPS = [
  { icon: Link2, label: 'Parsing URL structure' },
  { icon: ShieldCheck, label: 'Checking HTTPS encryption' },
  { icon: FileText, label: 'Analyzing domain patterns' },
  { icon: Link2, label: 'Detecting lookalike domains' },
  { icon: Sparkles, label: 'Evaluating financial keywords' },
  { icon: FileText, label: 'Generating security report' },
];

type Phase = 'input' | 'analyzing' | 'result';

export function LinkAnalyzerPage() {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [result, setResult] = useState<RiskResult | null>(null);

  const handleDemo = () => {
    setUrl(DEMO_LINK);
    toast('Demo link loaded');
  };

  const handleAnalyze = () => {
    if (!url.trim()) {
      toast('Please enter a URL to analyze', 'warning');
      return;
    }
    setPhase('analyzing');
  };

  const handleComplete = () => {
    const res = analyzeURL(url);
    setResult(res);
    setPhase('result');
    toast('Link analysis complete');
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
          <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-cyan-glow" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold text-white">Payment Link Analyzer</h1>
        </div>
        <p className="text-gray-400">Inspect suspicious payment URLs for phishing indicators.</p>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel p-6 lg:p-8"
          >
            <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">Payment URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/payment"
              className="input-field font-mono"
            />
            <div className="flex flex-wrap gap-3 mt-5">
              <button onClick={handleDemo} className="btn-secondary">
                <FileText className="w-4 h-4" /> Use Demo Link
              </button>
              <button onClick={handleAnalyze} className="btn-primary">
                <Sparkles className="w-4 h-4" /> Analyze Link
              </button>
            </div>
            <div className="mt-5 p-3 rounded-xl bg-caution/5 border border-caution/20 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-caution shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400">
                This is a <strong className="text-caution">Prototype Security Analysis</strong> using deterministic heuristics.
                It does not perform real-time domain reputation checks unless a real API is connected.
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
            <RiskResultPanel result={result} onAnalyzeAnother={handleReset} label="Link Analysis" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
