import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Shield, ShieldCheck, AlertTriangle, MessageSquare, Link2, QrCode,
  CreditCard, ArrowRight, ArrowDown, Brain, ScanLine, FileText, Lock,
} from 'lucide-react';
import { LandingNav } from '@/components/LandingNav';

const FLOATING_EXAMPLES = [
  { score: 94, label: 'CRITICAL', text: 'Phishing Detected', color: '#ef4444', delay: 0 },
  { score: 82, label: 'HIGH', text: 'Suspicious Payment', color: '#fb923c', delay: 0.5 },
  { score: 12, label: 'SAFE', text: 'Verified Merchant', color: '#22c55e', delay: 1 },
  { score: 76, label: 'HIGH', text: 'AI Explanation Ready', color: '#fb923c', delay: 1.5 },
];

const FEATURES = [
  { icon: MessageSquare, title: 'Message Analysis', desc: 'Detect phishing, impersonation and social-engineering patterns in SMS, WhatsApp and email.' },
  { icon: Link2, title: 'Payment Link Analysis', desc: 'Inspect suspicious payment URLs for phishing indicators and lookalike domains.' },
  { icon: QrCode, title: 'QR Intelligence', desc: 'Inspect payment QR information and recipient details before sending money.' },
  { icon: CreditCard, title: 'Transaction Risk Analysis', desc: 'Evaluate transaction behavior, amount deviation and recipient history.' },
];

const STEPS = [
  { icon: ScanLine, title: 'Submit Suspicious Input', desc: 'Paste a message, enter a URL, scan a QR code, or describe a transaction.' },
  { icon: Brain, title: 'AI Analyzes Security Indicators', desc: 'The engine checks urgency, impersonation, phishing patterns, and financial lures.' },
  { icon: Shield, title: 'Risk Engine Calculates Threat Score', desc: 'Deterministic heuristics produce a consistent 0–100 risk score.' },
  { icon: FileText, title: 'Get Explanation & Recommendation', desc: 'Understand exactly why it was flagged and what to do next.' },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <LandingNav />

      {/* Hero */}
      <section id="home" className="relative pt-32 pb-20 section-padding max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan/10 border border-cyan/20 mb-6">
              <Lock className="w-3.5 h-3.5 text-cyan-glow" />
              <span className="text-xs font-mono text-cyan-glow uppercase tracking-wider">AI-Powered Fraud Prevention</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white leading-tight">
              Know the Risk <span className="text-cyan-glow text-glow">Before You Pay.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-400 leading-relaxed max-w-xl">
              AI-powered financial scam detection that analyzes suspicious messages, payment links, QR codes and transactions before you lose money.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button onClick={() => navigate('/auth')} className="btn-primary">
                Analyze a Threat <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => navigate('/auth')} className="btn-secondary">
                Explore Dashboard
              </button>
            </div>
            <div className="mt-10 flex gap-8">
              <div>
                <p className="font-mono text-3xl font-bold text-white">94<span className="text-cyan-glow">/100</span></p>
                <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Max Risk Score</p>
              </div>
              <div>
                <p className="font-mono text-3xl font-bold text-white">4<span className="text-cyan-glow">×</span></p>
                <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Analysis Types</p>
              </div>
              <div>
                <p className="font-mono text-3xl font-bold text-white">100<span className="text-cyan-glow">%</span></p>
                <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Explainable</p>
              </div>
            </div>
          </motion.div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative h-[400px] lg:h-[480px]"
          >
            {/* Central shield */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-48 h-48 lg:w-56 lg:h-56">
                <div className="absolute inset-0 rounded-full bg-cyan/5 blur-3xl animate-pulse-glow" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-3xl bg-ink-850/80 border border-cyan/20 flex items-center justify-center shadow-glow backdrop-blur-xl">
                    <ShieldCheck className="w-16 h-16 lg:w-20 lg:h-20 text-cyan-glow" />
                  </div>
                </div>
                {/* Orbiting ring */}
                <motion.div
                  className="absolute inset-0 rounded-full border border-cyan/10"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-cyan-glow shadow-glow" />
                </motion.div>
              </div>
            </div>

            {/* Floating examples */}
            {FLOATING_EXAMPLES.map((ex, i) => {
              const positions = [
                'top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0',
              ];
              return (
                <motion.div
                  key={i}
                  className={`absolute ${positions[i]} glass-card p-3 w-36 lg:w-40`}
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: ex.delay }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-lg font-bold" style={{ color: ex.color }}>{ex.score}</span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: ex.color }}>/100</span>
                  </div>
                  <span className="badge text-[10px]" style={{ color: ex.color, backgroundColor: `${ex.color}15`, border: `1px solid ${ex.color}30` }}>
                    {ex.label}
                  </span>
                  <p className="text-xs text-gray-400 mt-1.5">{ex.text}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Problem section */}
      <section className="py-20 section-padding max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Before */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-panel p-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-critical/10 border border-critical/20 mb-5">
              <AlertTriangle className="w-3.5 h-3.5 text-critical" />
              <span className="text-xs font-mono text-critical uppercase tracking-wider">Before</span>
            </div>
            <h3 className="text-2xl font-heading font-bold text-white mb-6">Fraud is Often Detected Too Late.</h3>
            <div className="space-y-3">
              {['Scam Message', 'User Trusts It', 'Payment Happens', 'Money Lost'].map((step, i) => (
                <div key={i}>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-ink-900/50 border border-ink-600">
                    <span className="font-mono text-sm text-critical font-bold">{i + 1}</span>
                    <span className="text-sm text-gray-300">{step}</span>
                  </div>
                  {i < 3 && <div className="flex justify-center py-1"><ArrowDown className="w-4 h-4 text-gray-600" /></div>}
                </div>
              ))}
            </div>
          </motion.div>

          {/* After */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-panel p-8 border-cyan/20"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan/10 border border-cyan/30 mb-5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-glow" />
              <span className="text-xs font-mono text-cyan-glow uppercase tracking-wider">After</span>
            </div>
            <h3 className="text-2xl font-heading font-bold text-white mb-6">Financial Scam Guardian Flow.</h3>
            <div className="space-y-3">
              {['Suspicious Input', 'AI Risk Analysis', 'Explainable Risk Score', 'Safer Decision'].map((step, i) => (
                <div key={i}>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-cyan/5 border border-cyan/20">
                    <span className="font-mono text-sm text-cyan-glow font-bold">{i + 1}</span>
                    <span className="text-sm text-gray-200">{step}</span>
                  </div>
                  {i < 3 && <div className="flex justify-center py-1"><ArrowDown className="w-4 h-4 text-cyan/40" /></div>}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 section-padding max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white">Comprehensive Threat Analysis</h2>
          <p className="mt-3 text-gray-400 max-w-2xl mx-auto">Four specialized analyzers covering the most common financial attack vectors.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 group cursor-pointer"
                onClick={() => navigate('/auth')}
              >
                <div className="w-12 h-12 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center mb-4 group-hover:shadow-glow-sm transition-all">
                  <Icon className="w-6 h-6 text-cyan-glow" />
                </div>
                <h3 className="font-heading font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 section-padding max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white">How It Works</h2>
          <p className="mt-3 text-gray-400 max-w-2xl mx-auto">From suspicious input to explainable recommendation in four steps.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative glass-card p-6"
              >
                <span className="absolute top-4 right-4 font-mono text-3xl font-bold text-cyan/10">{i + 1}</span>
                <div className="w-12 h-12 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-cyan-glow" />
                </div>
                <h3 className="font-heading font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Scam Intelligence teaser */}
      <section id="intelligence" className="py-20 section-padding max-w-7xl mx-auto">
        <div className="glass-panel p-8 lg:p-12 text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-cyan/10 border border-cyan/30 items-center justify-center mb-6 shadow-glow-sm">
            <Brain className="w-8 h-8 text-cyan-glow" />
          </div>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white">Scam Intelligence Library</h2>
          <p className="mt-3 text-gray-400 max-w-2xl mx-auto">
            Learn how UPI scams, QR fraud, phishing, investment schemes, and OTP theft work — and exactly what to do (and not do) when you encounter them.
          </p>
          <button onClick={() => navigate('/auth')} className="btn-primary mt-8">
            Explore Intelligence <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 section-padding max-w-7xl mx-auto">
        <div className="relative glass-panel p-12 lg:p-16 text-center overflow-hidden">
          <div className="absolute inset-0 bg-radial-glow opacity-50" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-heading font-bold text-white">Protect Your Next Payment.</h2>
            <p className="mt-4 text-gray-400 max-w-2xl mx-auto text-lg">
              Don't just detect financial fraud. Understand the risk before the money leaves.
            </p>
            <button onClick={() => navigate('/auth')} className="btn-primary mt-8 text-base px-8 py-3">
              Start Analysis <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-cyan/10 py-8 section-padding max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-cyan-glow" />
            <span className="font-heading font-bold text-white text-sm">Financial Scam Guardian</span>
          </div>
          <p className="text-xs text-gray-500 font-mono">
            Prototype for hackathon demo. Not connected to real banking systems.
          </p>
        </div>
      </footer>
    </div>
  );
}
