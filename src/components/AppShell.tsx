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

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 flex items-center gap-3 border-b border-cyan/10">
        <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/30 flex items-center justify-center shadow-glow-sm">
          <Shield className="w-5 h-5 text-cyan-glow" />
        </div>
        <div className="min-w-0">
          <h1 className="font-heading font-bold text-white text-sm leading-tight">PaySafe</h1>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-cyan/10">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-ink-900/50">
          <div className="w-9 h-9 rounded-full bg-cyan/20 border border-cyan/30 flex items-center justify-center font-mono font-bold text-cyan-glow text-sm shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-body font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="nav-link w-full mt-2 text-critical hover:bg-critical/10">
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </div>
  );

  const currentPath = NAV_ITEMS.find((n) => n.to === location.pathname)?.label ?? '';

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-ink-900/80 backdrop-blur-xl border-r border-cyan/10 fixed h-screen z-40">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 h-screen w-64 bg-ink-900 border-r border-cyan/10 z-50 lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-ink-950/90 backdrop-blur-xl border-b border-cyan/10 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setMobileOpen(true)} className="text-gray-400 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-glow" />
            <span className="font-heading font-bold text-white text-sm">PaySafe</span>
          </div>
          <div className="w-6" />
        </header>

        {/* Breadcrumb (desktop) */}
        <div className="hidden lg:flex items-center gap-2 px-8 pt-6 text-sm text-gray-500">
          <span className="font-mono">PaySafe</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-cyan-glow font-mono">{currentPath || 'Dashboard'}</span>
        </div>

        <main className="p-4 lg:p-8 lg:pt-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
