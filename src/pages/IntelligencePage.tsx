import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCog, Search, X, AlertTriangle, CheckCircle2, XCircle,
  Info, ArrowRight, ShieldAlert,
} from 'lucide-react';
import { SCAM_GUIDES, type ScamGuide } from '@/lib/storage';
import { riskLevelColor, type RiskLevel } from '@/lib/riskEngine';

const riskLevelMap: Record<string, RiskLevel> = {
  LOW: 'LOW', MEDIUM: 'SUSPICIOUS', HIGH: 'HIGH', CRITICAL: 'CRITICAL',
};

export function IntelligencePage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ScamGuide | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return SCAM_GUIDES;
    return SCAM_GUIDES.filter((g) =>
      g.title.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.shortDescription.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
            <BrainCog className="w-5 h-5 text-cyan-glow" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold text-white">Scam Intelligence</h1>
        </div>
        <p className="text-gray-400">Learn how scams work and exactly what to do when you encounter them.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search scam guides..." className="input-field pl-10 py-2.5" />
      </div>

      {/* Guide cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((guide, i) => {
          const level = riskLevelMap[guide.riskLevel] ?? 'SUSPICIOUS';
          const color = riskLevelColor[level];
          return (
            <motion.div key={guide.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-gray-500">{guide.category}</span>
                <span className="badge text-[10px]" style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>{guide.riskLevel}</span>
              </div>
              <h3 className="font-heading font-semibold text-white text-base mb-2">{guide.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed flex-1">{guide.shortDescription}</p>
              <button onClick={() => setSelected(guide)} className="btn-secondary mt-4 self-start text-xs py-2">
                Learn More <ArrowRight className="w-3 h-3" />
              </button>
            </motion.div>
          );
        })}
        {filtered.length === 0 && <div className="col-span-full p-12 text-center text-gray-500"><p>No guides match your search.</p></div>}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-2xl max-h-[85vh] overflow-y-auto glass-panel p-6 lg:p-8 z-50">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-gray-500">{selected.category}</span>
                  <h2 className="text-xl font-heading font-bold text-white mt-1">{selected.title}</h2>
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="mb-5">
                <span className="badge" style={{ color: riskLevelColor[riskLevelMap[selected.riskLevel] ?? 'SUSPICIOUS'], backgroundColor: `${riskLevelColor[riskLevelMap[selected.riskLevel] ?? 'SUSPICIOUS']}15`, border: `1px solid ${riskLevelColor[riskLevelMap[selected.riskLevel] ?? 'SUSPICIOUS']}30` }}>
                  <ShieldAlert className="w-3 h-3" /> {selected.riskLevel} RISK
                </span>
              </div>

              <div className="space-y-5">
                <div className="bg-ink-900/40 rounded-xl p-4 border border-cyan/10">
                  <h3 className="text-sm font-heading font-semibold text-cyan-glow mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> How It Works</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">{selected.howItWorks}</p>
                </div>

                <div className="bg-caution/5 rounded-xl p-4 border border-caution/20">
                  <h3 className="text-sm font-heading font-semibold text-caution mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Warning Signs</h3>
                  <ul className="space-y-1.5">
                    {selected.warningSigns.map((w, i) => <li key={i} className="text-sm text-gray-300 flex items-start gap-2"><span className="text-caution mt-1">•</span> {w}</li>)}
                  </ul>
                </div>

                <div className="bg-safe/5 rounded-xl p-4 border border-safe/20">
                  <h3 className="text-sm font-heading font-semibold text-safe mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> What To Do</h3>
                  <ul className="space-y-1.5">
                    {selected.whatToDo.map((w, i) => <li key={i} className="text-sm text-gray-300 flex items-start gap-2"><span className="text-safe mt-1">•</span> {w}</li>)}
                  </ul>
                </div>

                <div className="bg-critical/5 rounded-xl p-4 border border-critical/20">
                  <h3 className="text-sm font-heading font-semibold text-critical mb-2 flex items-center gap-2"><XCircle className="w-4 h-4" /> What NOT To Do</h3>
                  <ul className="space-y-1.5">
                    {selected.whatNotToDo.map((w, i) => <li key={i} className="text-sm text-gray-300 flex items-start gap-2"><span className="text-critical mt-1">•</span> {w}</li>)}
                  </ul>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
