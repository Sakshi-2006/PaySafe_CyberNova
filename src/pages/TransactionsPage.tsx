import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Search, Eye, X, ShieldCheck, AlertTriangle,
  ShieldAlert, Ban, ArrowRight,
} from 'lucide-react';
import {
  getTransactions, setTransactions, type TransactionRecord,
} from '@/lib/storage';
import { riskLevelColor, riskLevelBg, type RiskLevel } from '@/lib/riskEngine';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';

const FILTERS = ['All', 'Safe', 'Suspicious', 'High Risk', 'Blocked'] as const;
type Filter = (typeof FILTERS)[number];

function statusToLevel(status: TransactionRecord['status']): RiskLevel {
  switch (status) {
    case 'SAFE': return 'SAFE';
    case 'SUSPICIOUS': return 'SUSPICIOUS';
    case 'HIGH RISK': return 'HIGH';
    case 'BLOCKED': return 'CRITICAL';
  }
}

const statusIcon = {
  SAFE: ShieldCheck,
  SUSPICIOUS: AlertTriangle,
  'HIGH RISK': ShieldAlert,
  BLOCKED: Ban,
} as const;

export function TransactionsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transactions, setTxState] = useState<TransactionRecord[]>(getTransactions);
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TransactionRecord | null>(null);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesFilter =
        filter === 'All' ||
        (filter === 'Safe' && tx.status === 'SAFE') ||
        (filter === 'Suspicious' && tx.status === 'SUSPICIOUS') ||
        (filter === 'High Risk' && tx.status === 'HIGH RISK') ||
        (filter === 'Blocked' && tx.status === 'BLOCKED');
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        tx.transaction.toLowerCase().includes(q) ||
        tx.recipient.toLowerCase().includes(q) ||
        tx.threatType.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [transactions, filter, search]);

  const handleBlock = (id: string) => {
    const updated = transactions.map((tx) => tx.id === id ? { ...tx, status: 'BLOCKED' as const } : tx);
    setTxState(updated);
    setTransactions(updated);
    toast('Transaction blocked');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-heading font-bold text-white">Transactions</h1>
        <p className="text-gray-400 mt-1">Monitor and review your transaction risk history.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-body font-medium transition-all ${filter === f ? 'bg-cyan/15 text-cyan-glow border border-cyan/30' : 'bg-ink-900/50 text-gray-400 border border-ink-600 hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..." className="input-field pl-10 py-2.5" />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block glass-panel overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cyan/10">
              <th className="text-left text-xs font-mono uppercase tracking-wider text-gray-500 px-5 py-3">Transaction</th>
              <th className="text-left text-xs font-mono uppercase tracking-wider text-gray-500 px-5 py-3">Recipient</th>
              <th className="text-right text-xs font-mono uppercase tracking-wider text-gray-500 px-5 py-3">Amount</th>
              <th className="text-left text-xs font-mono uppercase tracking-wider text-gray-500 px-5 py-3">Date</th>
              <th className="text-center text-xs font-mono uppercase tracking-wider text-gray-500 px-5 py-3">Risk Score</th>
              <th className="text-center text-xs font-mono uppercase tracking-wider text-gray-500 px-5 py-3">Status</th>
              <th className="text-center text-xs font-mono uppercase tracking-wider text-gray-500 px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((tx) => {
              const level = statusToLevel(tx.status);
              const color = riskLevelColor[level];
              const Icon = statusIcon[tx.status];
              return (
                <tr key={tx.id} className="border-b border-cyan/5 hover:bg-ink-700/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                        <CreditCard className="w-4 h-4" style={{ color }} />
                      </div>
                      <span className="text-sm font-body font-medium text-white">{tx.transaction}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-sm text-gray-400">{tx.recipient}</td>
                  <td className="px-5 py-4 text-right font-mono text-sm font-semibold text-white">{tx.amount > 0 ? `₹${tx.amount.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-5 py-4 font-mono text-sm text-gray-400">{tx.date}</td>
                  <td className="px-5 py-4 text-center">
                    <span className="font-mono text-lg font-bold" style={{ color }}>{tx.riskScore}</span>
                    <span className="text-xs text-gray-500">/100</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`badge ${riskLevelBg[level]}`}><Icon className="w-3 h-3" /> {tx.status}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button onClick={() => setSelected(tx)} className="btn-ghost text-xs"><Eye className="w-4 h-4" /> View</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-12 text-center text-gray-500"><p>No transactions match your filters.</p></div>}
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {filtered.map((tx) => {
          const level = statusToLevel(tx.status);
          const color = riskLevelColor[level];
          const Icon = statusIcon[tx.status];
          return (
            <div key={tx.id} className="glass-card p-4 cursor-pointer" onClick={() => setSelected(tx)}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                  <CreditCard className="w-5 h-5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-semibold text-white truncate">{tx.transaction}</p>
                  <p className="text-xs font-mono text-gray-500 truncate">{tx.recipient}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-mono text-sm font-bold" style={{ color }}>{tx.riskScore}/100</span>
                    <span className={`badge text-[10px] ${riskLevelBg[level]}`}><Icon className="w-3 h-3" />{tx.status}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm font-semibold text-white">{tx.amount > 0 ? `₹${tx.amount.toLocaleString('en-IN')}` : '—'}</p>
                  <p className="text-xs text-gray-500">{tx.date}</p>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="p-12 text-center text-gray-500"><p>No transactions match your filters.</p></div>}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-lg max-h-[85vh] overflow-y-auto glass-panel p-6 z-50">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-heading font-bold text-white">{selected.transaction}</h2>
                  <p className="text-sm font-mono text-gray-500 mt-1">{selected.recipient}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-ink-900/50 rounded-xl p-3 border border-cyan/10">
                  <p className="text-xs text-gray-500 mb-1">Amount</p>
                  <p className="font-mono text-sm font-bold text-white">{selected.amount > 0 ? `₹${selected.amount.toLocaleString('en-IN')}` : '—'}</p>
                </div>
                <div className="bg-ink-900/50 rounded-xl p-3 border border-cyan/10">
                  <p className="text-xs text-gray-500 mb-1">Risk Score</p>
                  <p className="font-mono text-sm font-bold" style={{ color: riskLevelColor[statusToLevel(selected.status)] }}>{selected.riskScore}/100</p>
                </div>
                <div className="bg-ink-900/50 rounded-xl p-3 border border-cyan/10">
                  <p className="text-xs text-gray-500 mb-1">Date</p>
                  <p className="font-mono text-sm font-bold text-white">{selected.date}</p>
                </div>
              </div>
              <div className="mb-5">
                <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">Threat Type</p>
                <p className="text-sm text-white">{selected.threatType}</p>
              </div>
              <div className="mb-5">
                <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-3">Risk Factors</p>
                <div className="space-y-2">
                  {selected.factors.map((f, i) => (
                    <div key={i} className="bg-ink-900/40 rounded-xl p-3 border border-cyan/10">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-body font-semibold text-white">{f.title}</p>
                        <span className="font-mono text-xs font-bold" style={{ color: riskLevelColor[statusToLevel(selected.status)] }}>+{f.scoreContribution}%</span>
                      </div>
                      <p className="text-xs text-gray-400">{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-ink-900/50 rounded-xl p-4 border border-cyan/10 mb-5">
                <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-2">Recommendation</p>
                <p className="text-sm text-gray-200">{selected.recommendation}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => { setSelected(null); navigate('/analyze'); }} className="btn-secondary">New Analysis <ArrowRight className="w-4 h-4" /></button>
                {selected.status !== 'BLOCKED' && selected.status !== 'SAFE' && (
                  <button onClick={() => { handleBlock(selected.id); setSelected(null); }} className="btn-primary"><Ban className="w-4 h-4" /> Block Transaction</button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
