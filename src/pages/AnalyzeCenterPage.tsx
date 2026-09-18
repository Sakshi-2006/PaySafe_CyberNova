import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Link2, QrCode, CreditCard, ArrowRight } from 'lucide-react';

const CARDS = [
  { title: 'Analyze Message', desc: 'Detect phishing, impersonation and social-engineering patterns.', icon: MessageSquare, to: '/analyze/message', btn: 'Analyze Message' },
  { title: 'Check Payment Link', desc: 'Inspect suspicious payment URLs for phishing indicators.', icon: Link2, to: '/analyze/link', btn: 'Analyze Link' },
  { title: 'Analyze QR Code', desc: 'Inspect payment QR information before sending money.', icon: QrCode, to: '/analyze/qr', btn: 'Scan QR' },
  { title: 'Analyze Transaction', desc: 'Evaluate transaction behaviour and financial risk.', icon: CreditCard, to: '/analyze/transaction', btn: 'Analyze Transaction' },
];

export function AnalyzeCenterPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-heading font-bold text-white">Analyze Before You Pay</h1>
        <p className="text-gray-400 mt-1">
          Check suspicious messages, payment links, QR codes and transactions before making a financial decision.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-6 lg:p-8 flex flex-col"
            >
              <div className="w-14 h-14 rounded-2xl bg-cyan/10 border border-cyan/20 flex items-center justify-center mb-5 shadow-glow-sm">
                <Icon className="w-7 h-7 text-cyan-glow" />
              </div>
              <h2 className="text-xl font-heading font-semibold text-white mb-2">{card.title}</h2>
              <p className="text-sm text-gray-400 leading-relaxed flex-1">{card.desc}</p>
              <button onClick={() => navigate(card.to)} className="btn-primary mt-5 self-start">
                {card.btn} <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
