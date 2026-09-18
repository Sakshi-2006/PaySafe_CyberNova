import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Sparkles, FileText, Link2, Calculator } from 'lucide-react';
import { AnalysisPipeline } from '@/components/AnalysisPipeline';
import { RiskResultPanel } from '@/components/RiskResultPanel';
import { analyzeMessage, type RiskResult } from '@/lib/riskEngine';
import { DEMO_SCAM_MESSAGE } from '@/lib/storage';
import { useToast } from '@/context/ToastContext';

const PIPELINE_STEPS = [
  { icon: FileText, label: 'Reading message' },
  { icon: Sparkles, label: 'Detecting urgency patterns' },
  { icon: MessageSquare, label: 'Checking impersonation' },
  { icon: Link2, label: 'Detecting phishing indicators' },
  { icon: Calculator, label: 'Calculating financial risk' },
  { icon: FileText, label: 'Generating explanation' },
];

type Phase = 'input' | 'analyzing' | 'result';

export function MessageAnalyzerPage() {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [result, setResult] = useState<RiskResult | null>(null);

  const handleDemo = () => {
    setText(DEMO_SCAM_MESSAGE);
    toast('Demo scam message loaded');
  };

  const handleAnalyze = () => {
    if (!text.trim()) {
      toast('Please enter a message to analyze', 'warning');
      return;
    }
    setPhase('analyzing');
  };

  const handleComplete = () => {
    const res = analyzeMessage(text);
    setResult(res);
    setPhase('result');
    toast('Analysis complete');
  };

  const handleReset = () => {
    setText('');
    setResult(null);
    setPhase('input');
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-cyan-glow" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold text-white">Message Scam Analyzer</h1>
        </div>
        <p className="text-gray-400">Analyze SMS, WhatsApp messages, emails or payment requests.</p>
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
            <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">Message Content</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste a suspicious message here..."
              rows={8}
              className="input-field resize-none font-body"
            />
            <div className="flex flex-wrap gap-3 mt-5">
              <button onClick={handleDemo} className="btn-secondary">
                <FileText className="w-4 h-4" /> Use Demo Scam
              </button>
              <button onClick={handleAnalyze} className="btn-primary">
                <Sparkles className="w-4 h-4" /> Analyze with AI
              </button>
            </div>
            {text && (
              <p className="text-xs text-gray-500 mt-4 font-mono">
                {text.length} characters · Ready for analysis
              </p>
            )}
          </motion.div>
        )}

        {phase === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AnalysisPipeline onComplete={handleComplete} steps={PIPELINE_STEPS} />
          </motion.div>
        )}

        {phase === 'result' && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <RiskResultPanel result={result} onAnalyzeAnother={handleReset} label="Message Analysis" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
