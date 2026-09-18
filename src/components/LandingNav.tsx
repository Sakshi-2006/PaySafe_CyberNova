import { Link, useNavigate } from 'react-router-dom';
import { Shield, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export function LandingNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { label: 'Home', href: '#home' },
    { label: 'How It Works', href: '#how' },
    { label: 'Features', href: '#features' },
    { label: 'Scam Intelligence', href: '#intelligence' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-ink-950/80 backdrop-blur-xl border-b border-cyan/10">
      <div className="section-padding max-w-7xl mx-auto flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan/10 border border-cyan/30 flex items-center justify-center shadow-glow-sm">
            <Shield className="w-5 h-5 text-cyan-glow" />
          </div>
          <div className="leading-tight">
            <span className="block font-heading font-bold text-white text-sm">Financial Scam</span>
            <span className="block font-heading font-bold text-cyan-glow text-sm">Guardian</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="btn-ghost text-sm">{l.label}</a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => navigate('/auth')} className="btn-ghost text-sm">
            {user ? 'Dashboard' : 'Log In'}
          </button>
          <button onClick={() => navigate(user ? '/dashboard' : '/auth')} className="btn-primary text-sm">
            Get Protected
          </button>
        </div>

        <button onClick={() => setMobileOpen((v) => !v)} className="md:hidden text-gray-400 hover:text-white">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-ink-900 border-b border-cyan/10 px-6 py-4 space-y-2">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="block btn-ghost text-sm">{l.label}</a>
          ))}
          <button onClick={() => navigate('/auth')} className="btn-primary w-full text-sm mt-2">Get Protected</button>
        </div>
      )}
    </nav>
  );
}
