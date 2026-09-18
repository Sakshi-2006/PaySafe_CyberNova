import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw, Save, Share2, ChevronDown, ChevronUp,
  ShieldAlert, ShieldCheck, ShieldQuestion, Lightbulb,
} from 'lucide-react';
import { RiskGauge } from './RiskGauge';
import {
  riskLevelColor, riskLevelBg, type RiskResult, type RiskLevel,
} from '@/lib/riskEngine';
import { useToast } from '@/context/ToastContext';
import { saveAnalysis, addHistoryEntry } from '@/lib/storage';

interface RiskResultPanelProps {
  result: RiskResult;
  onAnalyzeAnother: () => void;
  label?: string;
}

const severityIcon = {
  critical: ShieldAlert,
  high: ShieldAlert,
  medium: ShieldQuestion,
  low: ShieldCheck,
} as const;

const severityColor: Record<string, string> = {
  critical: 'text-critical bg-critical/10 border-critical/30',
  high: 'text-high bg-high/10 border-high/30',
  medium: 'text-caution bg-caution/10 border-caution/30',
  low: 'text-safe bg-safe/10 border-safe/30',
};

export function RiskResultPanel({ result, onAnalyzeAnother, label }: RiskResultPanelProps) {
  const { toast } = useToast();
  const [showExplanation, setShowExplanation] = useState(false);
  const [expandedFactors, setExpandedFactors] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState(false);

  const color = riskLevelColor[result.riskLevel];

  const handleSave = () => {
    const lbl = label ?? `${result.inputType} analysis`;
    saveAnalysis(result, lbl);
    addHistoryEntry({
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      threatType: result.threatType,
      inputType: result.inputType,
      label: lbl,
    });
    setSaved(true);
    toast('Analysis saved to Risk History');
  };

  const handleShare = async () => {
    const summary = [
      `Financial Scam Guardian — Risk Report`,
      `Risk Score: ${result.riskScore}/100 (${result.riskLevel})`,
      `Threat: ${result.threatType}`,
      `Confidence: ${result.confidence}%`,
      ``,
      `Risk Factors:`,
      ...result.factors.map((f) => `  - ${f.title} (${f.scoreContribution}%): ${f.description}`),
      ``,
      `Recommendation: ${result.recommendation}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(summary);
      toast('Report copied to clipboard');
    } catch {
      toast('Could not copy to clipboard', 'warning');
    }
  };

  const toggleFactor = (i: number) => {
    setExpandedFactors((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const maxContribution = Math.max(...result.factors.map((f) => f.scoreContribution), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Main result card */}
      <div className="glass-panel p-8">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="flex-shrink-0">
            <RiskGauge score={result.riskScore} level={result.riskLevel} />
          </div>
          <div className="flex-1 space-y-4 w-full">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-1">Threat Classification</p>
              <h3 className="text-xl font-heading font-semibold text-white">{result.threatType}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-ink-900/50 rounded-xl p-3 border border-cyan/10">
                <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Confidence</p>
                <p className="font-mono text-2xl font-bold" style={{ color }}>
                  {result.confidence}%
                </p>
              </div>
              <div className="bg-ink-900/50 rounded-xl p-3 border border-cyan/10">
                <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-1">Risk Level</p>
                <span className={`badge ${riskLevelBg[result.riskLevel]}`}>{result.riskLevel}</span>
              </div>
            </div>
            <div className="bg-ink-900/50 rounded-xl p-4 border border-cyan/10">
              <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" /> Recommendation
              </p>
              <p className="text-sm text-gray-200 leading-relaxed">{result.recommendation}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Risk factors breakdown */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-heading font-semibold text-white mb-1">Why Was This Flagged?</h3>
        <p className="text-sm text-gray-500 mb-5">{result.analysisSummary}</p>
        <div className="space-y-3">
          {result.factors.map((factor, i) => {
            const Icon = severityIcon[factor.severity] ?? ShieldQuestion;
            const expanded = expandedFactors.has(i);
            return (
              <div key={i} className="bg-ink-900/40 rounded-xl border border-cyan/10 overflow-hidden">
                <button
                  onClick={() => toggleFactor(i)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-ink-700/30 transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${severityColor[factor.severity]} shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-heading font-semibold text-white text-sm">{factor.title}</h4>
                      <span className="font-mono text-sm font-bold shrink-0" style={{ color }}>
                        +{factor.scoreContribution}%
                      </span>
                    </div>
                    {/* Contribution bar */}
                    <div className="mt-2 h-1.5 bg-ink-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(factor.scoreContribution / maxContribution) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                      />
                    </div>
                  </div>
                  {expanded ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
                </button>
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="px-4 pb-4 pl-16 text-sm text-gray-400 leading-relaxed">{factor.description}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed explanation toggle */}
      <div className="glass-panel overflow-hidden">
        <button
          onClick={() => setShowExplanation((v) => !v)}
          className="w-full flex items-center justify-between p-5 hover:bg-ink-700/30 transition-colors"
        >
          <span className="font-heading font-semibold text-white">View Detailed Explanation</span>
          {showExplanation ? <ChevronUp className="w-5 h-5 text-cyan-glow" /> : <ChevronDown className="w-5 h-5 text-cyan-glow" />}
        </button>
        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-5 pt-0 space-y-4">
                <div className="bg-ink-900/40 rounded-xl p-4 border border-cyan/10">
                  <h4 className="text-sm font-heading font-semibold text-cyan-glow mb-2">AI Analysis Summary</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{result.analysisSummary}</p>
                </div>
                <div className="bg-ink-900/40 rounded-xl p-4 border border-cyan/10">
                  <h4 className="text-sm font-heading font-semibold text-cyan-glow mb-2">Factor Breakdown</h4>
                  <ul className="space-y-2">
                    {result.factors.map((f, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="font-mono font-bold shrink-0" style={{ color }}>+{f.scoreContribution}%</span>
                        <span><strong className="text-white">{f.title}:</strong> {f.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-ink-900/40 rounded-xl p-4 border border-cyan/10">
                  <h4 className="text-sm font-heading font-semibold text-cyan-glow mb-2">Final Recommendation</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{result.recommendation}</p>
                </div>
                {result.inputType === 'url' && (
                  <p className="text-xs text-gray-500 italic">
                    Note: This is a prototype security analysis using deterministic heuristics, not real-time domain reputation.
                  </p>
                )}
                {result.inputType === 'qr' && (
                  <p className="text-xs text-gray-500 italic">
                    Note: This prototype does not perform actual UPI verification. Always verify recipients through official channels.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button onClick={onAnalyzeAnother} className="btn-secondary">
          <RotateCcw className="w-4 h-4" /> Analyze Another
        </button>
        <button onClick={handleSave} disabled={saved} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
          <Save className="w-4 h-4" /> {saved ? 'Saved' : 'Save Analysis'}
        </button>
        <button onClick={handleShare} className="btn-secondary">
          <Share2 className="w-4 h-4" /> Share Report
        </button>
      </div>
    </motion.div>
  );
}
