import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageSquare, Link2, QrCode, CreditCard, Shield, AlertTriangle,
  TrendingUp, Activity, Bell, ArrowRight, Eye,
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { getTransactions, getAlerts, getHistory } from '@/lib/storage';
import { riskLevelColor, riskLevelBg } from '@/lib/riskEngine';

const trendData = [
  { day: 'Mon', score: 45 },
  { day: 'Tue', score: 72 },
  { day: 'Wed', score: 38 },
  { day: 'Thu', score: 91 },
  { day: 'Fri', score: 64 },
  { day: 'Sat', score: 28 },
  { day: 'Sun', score: 55 },
];

const STATS = [
  { label: 'Financial Safety Score', value: '86', suffix: '/100', icon: Shield, color: '#22c55e' },
  { label: 'Threats Detected', value: '07', suffix: '', icon: AlertTriangle, color: '#fb923c' },
  { label: 'Money Protected', value: '₹42,500', suffix: '', icon: TrendingUp, color: '#22d3ee' },
  { label: 'Analyses Completed', value: '38', suffix: '', icon: Activity, color: '#a78bfa' },
  { label: 'Active Alerts', value: '02', suffix: '', icon: Bell, color: '#ef4444' },
];

const QUICK_ACTIONS = [
  { title: 'Analyze Message', desc: 'SMS, WhatsApp, Email', icon: MessageSquare, to: '/analyze/message' },
  { title: 'Check Payment Link', desc: 'Inspect suspicious URLs', icon: Link2, to: '/analyze/link' },
  { title: 'Scan QR Code', desc: 'Verify before paying', icon: QrCode, to: '/analyze/qr' },
  { title: 'Analyze Transaction', desc: 'Evaluate payment risk', icon: CreditCard, to: '/analyze/transaction' },
];

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const transactions = getTransactions().slice(0, 4);
  const alerts = getAlerts().filter((a) => !a.dismissed).slice(0, 3);
  const history = getHistory().slice(0, 5);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-heading font-bold text-white">
          {greeting}, {user?.name?.split(' ')[0] ?? 'Guardian'}
        </h1>
        <p className="text-gray-400 mt-1">Your financial security overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {STATS.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15`, border: `1px solid ${stat.color}30` }}>
                  <Icon className="w-4.5 h-4.5" style={{ color: stat.color }} />
                </div>
              </div>
              <p className="font-mono text-2xl font-bold text-white">
                {stat.value}<span className="text-sm text-gray-500">{stat.suffix}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-heading font-semibold text-white mb-3">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(action.to)}
                className="glass-card p-5 text-left group"
              >
                <div className="w-11 h-11 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center mb-3 group-hover:shadow-glow-sm transition-all">
                  <Icon className="w-5 h-5 text-cyan-glow" />
                </div>
                <h3 className="font-heading font-semibold text-white text-sm">{action.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{action.desc}</p>
                <div className="flex items-center gap-1 mt-3 text-xs text-cyan-glow opacity-0 group-hover:opacity-100 transition-opacity">
                  Start <ArrowRight className="w-3 h-3" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Charts + Recent activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Risk overview chart */}
        <div className="lg:col-span-2 glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading font-semibold text-white">Risk Overview</h2>
            <button onClick={() => navigate('/risk-history')} className="btn-ghost text-xs">
              View Risk History <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="#6b7280" fontSize={12} fontFamily="JetBrains Mono" />
              <YAxis stroke="#6b7280" fontSize={12} fontFamily="JetBrains Mono" domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: '#0b1020', border: '1px solid rgba(34,211,238,0.2)', borderRadius: '12px', fontFamily: 'JetBrains Mono' }}
                labelStyle={{ color: '#22d3ee' }}
              />
              <Area type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={2} fill="url(#riskGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent security alerts */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading font-semibold text-white">Security Alerts</h2>
            <button onClick={() => navigate('/alerts')} className="btn-ghost text-xs">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => {
              const color = riskLevelColor[alert.riskScore > 85 ? 'CRITICAL' : alert.riskScore > 70 ? 'HIGH' : alert.riskScore > 50 ? 'SUSPICIOUS' : 'LOW'];
              return (
                <div key={alert.id} className="bg-ink-900/40 rounded-xl p-3 border border-cyan/10">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body font-semibold text-white truncate">{alert.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{alert.time}</p>
                    </div>
                    <span className="font-mono text-sm font-bold shrink-0" style={{ color }}>
                      {alert.riskScore}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-semibold text-white">Recent Activity</h2>
          <button onClick={() => navigate('/transactions')} className="btn-ghost text-xs">
            View All <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2">
          {transactions.map((tx) => {
            const level = tx.riskScore > 85 ? 'CRITICAL' : tx.riskScore > 70 ? 'HIGH' : tx.riskScore > 50 ? 'SUSPICIOUS' : tx.riskScore > 30 ? 'LOW' : 'SAFE';
            const color = riskLevelColor[level];
            return (
              <div key={tx.id} className="flex items-center gap-4 p-3 rounded-xl bg-ink-900/40 border border-cyan/10 hover:border-cyan/20 transition-colors">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                  <CreditCard className="w-5 h-5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-semibold text-white truncate">{tx.transaction}</p>
                  <p className="text-xs text-gray-500">{tx.recipient}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm font-bold text-white">{tx.amount > 0 ? `₹${tx.amount.toLocaleString('en-IN')}` : '—'}</p>
                  <span className={`badge text-[10px] ${riskLevelBg[level]}`}>{level}</span>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="font-mono text-lg font-bold" style={{ color }}>{tx.riskScore}</p>
                  <p className="text-[10px] text-gray-500 uppercase">/100</p>
                </div>
                <button onClick={() => navigate('/transactions')} className="btn-ghost text-xs shrink-0">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent risk history mini */}
      <div className="glass-panel p-6">
        <h2 className="text-lg font-heading font-semibold text-white mb-4">Recent Risk Analyses</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {history.map((h) => {
            const color = riskLevelColor[h.riskLevel as keyof typeof riskLevelColor] ?? '#6b7280';
            return (
              <div key={h.id} className="bg-ink-900/40 rounded-xl p-3 border border-cyan/10">
                <p className="text-xs text-gray-500 mb-1">{h.date}</p>
                <p className="font-mono text-xl font-bold" style={{ color }}>{h.riskScore}</p>
                <p className="text-xs text-gray-400 mt-1 truncate">{h.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
