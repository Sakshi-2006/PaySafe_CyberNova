import { useState } from 'react';
import { NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, LayoutDashboard, ScanLine, CreditCard, Bell, History,
  BrainCog, Settings, LogOut, Menu, X, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analyze', label: 'Analyze', icon: ScanLine },
  { to: '/transactions', label: 'Transactions', icon: CreditCard },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/risk-history', label: 'Risk History', icon: History },
  { to: '/intelligence', label: 'Scam Intelligence', icon: BrainCog },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full min-h-0 w-full overflow-hidden">
      <button
        type="button"
        onClick={() => mobile ? setMobileOpen(false) : setCollapsed((v) => !v)}
        className="group shrink-0 w-full px-4 py-4 flex items-center gap-3 border-b border-cyan/10 text-left overflow-hidden"
        aria-label={mobile ? 'Close navigation' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={mobile ? 'Close navigation' : collapsed ? 'Expand PaySafe sidebar' : 'Collapse PaySafe sidebar'}
      >
        <div className="w-10 h-10 shrink-0 rounded-xl bg-cyan/10 border border-cyan/30 flex items-center justify-center shadow-glow-sm group-hover:bg-cyan/20 transition-all duration-300">
          <Shield className="w-5 h-5 text-cyan-glow" />
        </div>
        <div className={`min-w-0 overflow-hidden transition-all duration-300 ${collapsed && !mobile ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          <h1 className="font-heading font-bold text-white text-sm leading-tight whitespace-nowrap">PaySafe</h1>
          <p className="text-[11px] text-gray-500 leading-tight whitespace-nowrap">AI Financial Security</p>
        </div>
      </button>

      <nav className="flex-1 min-h-0 w-full px-3 py-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              title={collapsed && !mobile ? item.label : undefined}
              className={({ isActive }) =>
                `nav-link w-full min-w-0 overflow-hidden ${isActive ? 'nav-link-active' : ''} ${collapsed && !mobile ? 'justify-center px-2' : ''}`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className={`text-sm truncate transition-all duration-300 overflow-hidden ${collapsed && !mobile ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="shrink-0 w-full px-3 py-3 border-t border-cyan/10 overflow-hidden">
        <div className={`flex items-center gap-3 p-3 rounded-xl bg-ink-900/50 min-w-0 overflow-hidden ${collapsed && !mobile ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-cyan/20 border border-cyan/30 flex items-center justify-center font-mono font-bold text-cyan-glow text-sm shrink-0">
            {initials}
          </div>
          <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ${collapsed && !mobile ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <p className="text-sm font-body font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title={collapsed && !mobile ? 'Logout' : undefined}
          className={`nav-link w-full min-w-0 mt-2 text-critical hover:bg-critical/10 overflow-hidden ${collapsed && !mobile ? 'justify-center px-2' : ''}`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className={`text-sm truncate transition-all duration-300 overflow-hidden ${collapsed && !mobile ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>Logout</span>
        </button>
      </div>
    </div>
  );

  const currentPath = NAV_ITEMS.find((n) => n.to === location.pathname)?.label ?? '';

  return (
    <div className="min-h-screen flex min-w-0 overflow-x-hidden">
      <aside className={`hidden lg:flex fixed left-0 top-0 h-screen z-40 shrink-0 bg-ink-900/80 backdrop-blur-xl border-r border-cyan/10 overflow-hidden transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 bg-black/60 z-50 lg:hidden" />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', damping: 25 }} className="fixed left-0 top-0 h-screen w-64 bg-ink-900 border-r border-cyan/10 z-50 lg:hidden overflow-hidden">
              <button type="button" onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white" aria-label="Close navigation"><X className="w-5 h-5" /></button>
              <SidebarContent mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className={`flex-1 min-w-0 transition-[margin] duration-300 ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <header className="lg:hidden sticky top-0 z-30 bg-ink-950/90 backdrop-blur-xl border-b border-cyan/10 px-4 py-3 flex items-center justify-between">
          <button type="button" onClick={() => setMobileOpen(true)} className="text-gray-400 hover:text-white" aria-label="Open navigation"><Menu className="w-6 h-6" /></button>
          <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-cyan-glow" /><span className="font-heading font-bold text-white text-sm">PaySafe</span></div>
          <div className="w-6" />
        </header>

        <div className="hidden lg:flex items-center gap-2 px-8 pt-6 text-sm text-gray-500">
          <span className="font-mono">PaySafe</span><ChevronRight className="w-4 h-4" /><span className="text-cyan-glow font-mono">{currentPath || 'Dashboard'}</span>
        </div>
        <main className="p-4 lg:p-8 lg:pt-4 min-w-0 overflow-x-hidden"><Outlet /></main>
      </div>
    </div>
  );
}
