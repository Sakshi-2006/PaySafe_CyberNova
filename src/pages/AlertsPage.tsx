import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Bell, Info, X,
  Eye, CheckCheck, Trash2, BellOff,
} from 'lucide-react';
import {
  getAlerts, setAlerts, type AlertRecord,
} from '@/lib/storage';
import { useToast } from '@/context/ToastContext';
import { useNavigate } from 'react-router-dom';

const CATEGORY_FILTERS = ['All', 'Critical', 'High', 'Medium', 'Low'] as const;
type CatFilter = (typeof CATEGORY_FILTERS)[number];

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldAlert, ShieldCheck, AlertTriangle, Bell, Info,
  CreditCard: ShieldAlert, Link: AlertTriangle, QrCode: ShieldAlert, MessageSquare: AlertTriangle,
};

const CAT_COLORS: Record<string, string> = {
  Critical: '#ef4444', High: '#fb923c', Medium: '#f59e0b', Low: '#22c55e',
};

export function AlertsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [alerts, setAlertsState] = useState<AlertRecord[]>(getAlerts);
  const [filter, setFilter] = useState<CatFilter>('All');

  const filtered = useMemo(() => {
    return alerts.filter((a) => !a.dismissed && (filter === 'All' || a.category === filter));
  }, [alerts, filter]);

  const unreadCount = alerts.filter((a) => !a.read && !a.dismissed).length;

  const updateAlerts = (updated: AlertRecord[]) => {
    setAlertsState(updated);
    setAlerts(updated);
  };

  const handleMarkRead = (id: string) => {
    updateAlerts(alerts.map((a) => a.id === id ? { ...a, read: true } : a));
    toast('Alert marked as read');
  };

  const handleDismiss = (id: string) => {
    updateAlerts(alerts.map((a) => a.id === id ? { ...a, dismissed: true } : a));
    toast('Alert dismissed');
  };

  const handleMarkAllRead = () => {
    updateAlerts(alerts.map((a) => ({ ...a, read: true })));
    toast('All alerts marked as read');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-heading font-bold text-white">Alert Center</h1>
            {unreadCount > 0 && <span className="badge bg-critical/15 text-critical border-critical/30">{unreadCount} unread</span>}
          </div>
          <p className="text-gray-400 mt-1">Real-time security alerts and threat notifications.</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-secondary text-sm"><CheckCheck className="w-4 h-4" /> Mark All Read</button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-body font-medium transition-all ${filter === cat ? 'bg-cyan/15 text-cyan-glow border border-cyan/30' : 'bg-ink-900/50 text-gray-400 border border-ink-600 hover:text-white'}`}>
            {cat}
            {cat !== 'All' && <span className="ml-1.5 text-xs text-gray-500">{alerts.filter((a) => !a.dismissed && a.category === cat).length}</span>}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((alert) => {
          const Icon = ICONS[alert.icon] ?? Bell;
          const color = CAT_COLORS[alert.category];
          return (
            <motion.div key={alert.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`glass-card p-5 ${!alert.read ? 'border-l-2' : ''}`} style={{ borderLeftColor: !alert.read ? color : undefined }}>
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-heading font-semibold text-white text-sm">{alert.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{alert.time} · {alert.source}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-lg font-bold" style={{ color }}>{alert.riskScore}</span>
                      <span className="text-xs text-gray-500">/100</span>
                      {!alert.read && <span className="w-2 h-2 rounded-full bg-cyan-glow animate-pulse" />}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mt-2 leading-relaxed">{alert.description}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button onClick={() => navigate('/analyze')} className="btn-ghost text-xs"><Eye className="w-3.5 h-3.5" /> View Analysis</button>
                    {!alert.read && <button onClick={() => handleMarkRead(alert.id)} className="btn-ghost text-xs"><CheckCheck className="w-3.5 h-3.5" /> Mark as Read</button>}
                    <button onClick={() => handleDismiss(alert.id)} className="btn-ghost text-xs hover:text-critical"><Trash2 className="w-3.5 h-3.5" /> Dismiss</button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div className="glass-panel p-12 text-center"><BellOff className="w-10 h-10 text-gray-600 mx-auto mb-3" /><p className="text-gray-400">No alerts in this category.</p></div>
        )}
      </div>
    </div>
  );
}
