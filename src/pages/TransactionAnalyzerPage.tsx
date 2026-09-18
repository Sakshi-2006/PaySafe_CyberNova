import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Sparkles, FileText, Calculator } from 'lucide-react';
import { AnalysisPipeline } from '@/components/AnalysisPipeline';
import { RiskResultPanel } from '@/components/RiskResultPanel';
import { analyzeTransaction, type RiskResult, type TransactionInput } from '@/lib/riskEngine';
import { DEMO_TRANSACTION } from '@/lib/storage';
import { useToast } from '@/context/ToastContext';

const PIPELINE_STEPS = [
  { icon: CreditCard, label: 'Reading transaction data' },
  { icon: Calculator, label: 'Evaluating amount deviation' },
  { icon: FileText, label: 'Checking recipient history' },
  { icon: Sparkles, label: 'Analyzing transaction time' },
  { icon: Calculator, label: 'Assessing category risk' },
  { icon: FileText, label: 'Generating risk explanation' },
];

const CATEGORIES = ['Payment', 'Payment Request', 'Transfer', 'Investment', 'Crypto', 'Bill Payment', 'Shopping', 'Gift Card', 'Lottery'];

type Phase = 'input' | 'analyzing' | 'result';

export function TransactionAnalyzerPage() {
  const { toast } = useToast();
  const [tx, setTx] = useState<TransactionInput>({
    amount: 0,
    recipient: '',
    category: 'Payment',
    time: '',
    isNewRecipient: false,
    previousFrequency: 0,
  });
  const [phase, setPhase] = useState<Phase>('input');
  const [result, setResult] = useState<RiskResult | null>(null);

  const handleDemo = () => {
    setTx(DEMO_TRANSACTION);
    toast('Demo transaction loaded');
  };

  const handleAnalyze = () => {
    if (tx.amount <= 0 || !tx.recipient.trim() || !tx.time.trim()) {
      toast('Please fill in all required fields', 'warning');
      return;
    }
    setPhase('analyzing');
  };

  const handleComplete = () => {
    const res = analyzeTransaction(tx);
    setResult(res);
    setPhase('result');
    toast('Transaction analysis complete');
  };

  const handleReset = () => {
    setTx({ amount: 0, recipient: '', category: 'Payment', time: '', isNewRecipient: false, previousFrequency: 0 });
    setResult(null);
    setPhase('input');
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-cyan-glow" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold text-white">Transaction Risk Analyzer</h1>
        </div>
        <p className="text-gray-400">Evaluate transaction behaviour and financial risk.</p>
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
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">Transaction Amount (₹)</label>
                <input
                  type="number"
                  value={tx.amount || ''}
                  onChange={(e) => setTx({ ...tx, amount: Number(e.target.value) })}
                  placeholder="0"
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">Recipient / UPI ID</label>
                <input
                  type="text"
                  value={tx.recipient}
                  onChange={(e) => setTx({ ...tx, recipient: e.target.value })}
                  placeholder="recipient@upi"
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">Transaction Category</label>
                <select
                  value={tx.category}
                  onChange={(e) => setTx({ ...tx, category: e.target.value })}
                  className="input-field font-body"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-ink-900">{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">Transaction Time</label>
                <input
                  type="text"
                  value={tx.time}
                  onChange={(e) => setTx({ ...tx, time: e.target.value })}
                  placeholder="e.g. 11:47 PM"
                  className="input-field font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">New Recipient?</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setTx({ ...tx, isNewRecipient: true })}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-body font-semibold transition-all ${tx.isNewRecipient ? 'bg-cyan/15 text-cyan-glow border border-cyan/30' : 'bg-ink-900/50 text-gray-400 border border-ink-600 hover:text-white'}`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setTx({ ...tx, isNewRecipient: false })}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-body font-semibold transition-all ${!tx.isNewRecipient ? 'bg-cyan/15 text-cyan-glow border border-cyan/30' : 'bg-ink-900/50 text-gray-400 border border-ink-600 hover:text-white'}`}
                  >
                    No
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">
                  Previous Transaction Frequency (optional)
                </label>
                <input
                  type="number"
                  value={tx.previousFrequency || ''}
                  onChange={(e) => setTx({ ...tx, previousFrequency: Number(e.target.value) })}
                  placeholder="0"
                  className="input-field font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={handleDemo} className="btn-secondary">
                <FileText className="w-4 h-4" /> Use Demo Transaction
              </button>
              <button onClick={handleAnalyze} className="btn-primary">
                <Sparkles className="w-4 h-4" /> Analyze Transaction
              </button>
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
            <RiskResultPanel result={result} onAnalyzeAnother={handleReset} label="Transaction Analysis" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
