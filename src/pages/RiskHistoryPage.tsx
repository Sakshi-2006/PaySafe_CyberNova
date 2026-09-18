import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { History, TrendingUp, AlertOctagon, ShieldCheck, Activity } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis,
  Tooltip, CartesianGrid, Cell,
} from 'recharts';
import { getHistory, getSavedAnalyses, type RiskHistoryEntry } from '@/lib/storage';
import { riskLevelColor, type RiskLevel } from '@/lib/riskEngine';

const TIME_FILTERS = ['7 Days', '30 Days', '90 Days'] as const;
type TimeFilter = (typeof TIME_FILTERS)[number];

export function RiskHistoryPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30 Days');
  const history = getHistory();
  const savedAnalyses = getSavedAnalyses();

  const days = timeFilter === '7 Days' ? 7 : timeFilter === '30 Days' ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const filteredHistory = useMemo(() => {
    return history.filter((h) => new Date(h.date) >= cutoff);
  }, [history, cutoff]);

  const trendData = useMemo(() => {
    const sorted = [...filteredHistory].reverse();
    return sorted.map((h, i) => ({ idx: i + 1, score: h.riskScore, label: h.label, date: h.date }));
  }, [filteredHistory]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredHistory.forEach((h) => {
      const cat = h.threatType === 'No Threat' ? 'No Threat' : h.threatType;
      counts[cat] = (counts[cat] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredHistory]);

  const stats = useMemo(() => {
    const total = filteredHistory.length;
    const avg = total > 0 ? Math.round(filteredHistory.reduce((s, h) => s + h.riskScore, 0) / total) : 0;
    const critical = filteredHistory.filter((h) => h.riskLevel === 'CRITICAL').length;
    const safe = filteredHistory.filter((h) => h.riskLevel === 'SAFE' || h.riskLevel === 'LOW').length;
    return { total, avg, critical, safe };
  }, [filteredHistory]);

  const STATS_CARDS = [
    { label: 'Total Analyses', value: stats.total, icon: Activity, color: '#22d3ee' },
    { label: 'Average Risk', value: `${stats.avg}/100`, icon: TrendingUp, color: '#f59e0b' },
    { label: 'Critical Threats', value: stats.critical, icon: AlertOctagon, color: '#ef4444' },
    { label: 'Safe Analyses', value: stats.safe, icon: ShieldCheck, color: '#22c55e' },
  ];

  const barColors = ['#22c55e', '#84cc16', '#f59e0b', '#fb923c', '#ef4444', '#22d3ee', '#a78bfa', '#6b7280'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold text-white">Risk History</h1>
          <p className="text-gray-400 mt-1">Track your risk analysis trends over time.</p>
        </div>
        <div className="flex gap-2">
          {TIME_FILTERS.map((tf) => (
            <button key={tf} onClick={() => setTimeFilter(tf)}
              className={`px-4 py-2 rounded-xl text-sm font-body font-medium transition-all ${timeFilter === tf ? 'bg-cyan/15 text-cyan-glow border border-cyan/30' : 'bg-ink-900/50 text-gray-400 border border-ink-600 hover:text-white'}`}>
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS_CARDS.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${stat.color}15`, border: `1px solid ${stat.color}30` }}>
                <Icon className="w-4.5 h-4.5" style={{ color: stat.color }} />
              </div>
              <p className="font-mono text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Trend chart */}
      <div className="glass-panel p-6">
        <h2 className="text-lg font-heading font-semibold text-white mb-4">Risk Score Trend</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="idx" stroke="#6b7280" fontSize={12} fontFamily="JetBrains Mono" />
            <YAxis stroke="#6b7280" fontSize={12} fontFamily="JetBrains Mono" domain={[0, 100]} />
            <Tooltip contentStyle={{ background: '#0b1020', border: '1px solid rgba(34,211,238,0.2)', borderRadius: '12px', fontFamily: 'JetBrains Mono' }} labelStyle={{ color: '#22d3ee' }}
              formatter={(v: number, _p: unknown, item: { payload: { label: string; date: string } }) => [`${v} — ${item.payload.label}`, 'Risk']} />
            <Area type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={2} fill="url(#trendGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Category chart */}
      <div className="glass-panel p-6">
        <h2 className="text-lg font-heading font-semibold text-white mb-4">Threat Category Distribution</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={categoryData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" stroke="#6b7280" fontSize={12} fontFamily="JetBrains Mono" />
            <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={11} fontFamily="JetBrains Mono" width={120} />
            <Tooltip contentStyle={{ background: '#0b1020', border: '1px solid rgba(34,211,238,0.2)', borderRadius: '12px', fontFamily: 'JetBrains Mono' }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {categoryData.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Saved analyses */}
      {savedAnalyses.length > 0 && (
        <div className="glass-panel p-6">
          <h2 className="text-lg font-heading font-semibold text-white mb-4">Saved Analyses</h2>
          <div className="space-y-2">
            {savedAnalyses.slice(0, 10).map((a) => {
              const color = riskLevelColor[a.riskLevel as RiskLevel] ?? '#6b7280';
              return (
                <div key={a.id} className="flex items-center gap-4 p-3 rounded-xl bg-ink-900/40 border border-cyan/10">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body font-semibold text-white truncate">{a.label}</p>
                    <p className="text-xs text-gray-500">{a.threatType} · {a.timestamp.slice(0, 10)}</p>
                  </div>
                  <span className="font-mono text-lg font-bold shrink-0" style={{ color }}>{a.riskScore}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History list */}
      <div className="glass-panel p-6">
        <h2 className="text-lg font-heading font-semibold text-white mb-4">All Analyses</h2>
        <div className="space-y-2">
          {filteredHistory.map((h: RiskHistoryEntry) => {
            const color = riskLevelColor[h.riskLevel as keyof typeof riskLevelColor] ?? '#6b7280';
            return (
              <div key={h.id} className="flex items-center gap-4 p-3 rounded-xl bg-ink-900/40 border border-cyan/10 hover:border-cyan/20 transition-colors">
                <History className="w-4 h-4 text-gray-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-semibold text-white truncate">{h.label}</p>
                  <p className="text-xs text-gray-500">{h.date} · {h.threatType} · {h.inputType}</p>
                </div>
                <span className="font-mono text-sm font-bold shrink-0" style={{ color }}>{h.riskScore}/100</span>
                <span className="badge text-[10px] shrink-0" style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>{h.riskLevel}</span>
              </div>
            );
          })}
          {filteredHistory.length === 0 && <p className="text-center text-gray-500 py-8">No analyses in this time period.</p>}
        </div>
      </div>
    </div>
  );
}
