import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanLine, AlertTriangle, UserCheck, Link2, Calculator, FileText, CheckCircle2,
} from 'lucide-react';

const STEPS = [
  { icon: ScanLine, label: 'Reading message' },
  { icon: AlertTriangle, label: 'Detecting urgency patterns' },
  { icon: UserCheck, label: 'Checking impersonation' },
  { icon: Link2, label: 'Detecting phishing indicators' },
  { icon: Calculator, label: 'Calculating financial risk' },
  { icon: FileText, label: 'Generating explanation' },
];

interface AnalysisPipelineProps {
  onComplete: () => void;
  steps?: typeof STEPS;
}

export function AnalysisPipeline({ onComplete, steps = STEPS }: AnalysisPipelineProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep < steps.length) {
      const timer = setTimeout(() => setCurrentStep((s) => s + 1), 500);
      return () => clearTimeout(timer);
    }
    const done = setTimeout(onComplete, 400);
    return () => clearTimeout(done);
  }, [currentStep, steps.length, onComplete]);

  return (
    <div className="glass-panel p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-cyan/10 border border-cyan/30 items-center justify-center mb-4 animate-pulse-glow">
          <ScanLine className="w-8 h-8 text-cyan-glow" />
        </div>
        <h3 className="text-xl font-heading font-semibold text-white">AI Analysis in Progress</h3>
        <p className="text-sm text-gray-500 mt-1">Running risk intelligence engine...</p>
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isDone = i < currentStep;
          const isActive = i === currentStep;
          const isPending = i > currentStep;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-4 p-3 rounded-xl border transition-all duration-300 ${
                isDone
                  ? 'bg-safe/5 border-safe/20'
                  : isActive
                  ? 'bg-cyan/10 border-cyan/30 shadow-glow-sm'
                  : 'bg-ink-900/40 border-ink-600 opacity-50'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isDone ? 'bg-safe/20 text-safe' : isActive ? 'bg-cyan/20 text-cyan-glow' : 'bg-ink-700 text-gray-600'
              }`}>
                {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />}
              </div>
              <span className={`font-body text-sm ${isDone ? 'text-safe' : isActive ? 'text-white' : 'text-gray-500'}`}>
                {step.label}
              </span>
              {isActive && (
                <motion.div
                  className="ml-auto flex gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-cyan-glow"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }}
                    />
                  ))}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
      <AnimatePresence>
        {currentStep >= steps.length && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 text-center"
          >
            <p className="text-sm text-safe font-mono">Analysis complete. Generating report...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
