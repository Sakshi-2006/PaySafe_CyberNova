import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export function AuthPage() {
  const { login, signup } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (tab === 'signup' && !name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password.trim()) e.password = 'Password is required';
    else if (password.length < 4) e.password = 'Password must be at least 4 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    if (tab === 'login') {
      login(email, password);
      toast('Welcome back!');
    } else {
      signup(name, email, password);
      toast('Account created successfully');
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center section-padding py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-cyan/10 border border-cyan/30 flex items-center justify-center shadow-glow">
              <Shield className="w-6 h-6 text-cyan-glow" />
            </div>
          </Link>
          <h1 className="text-2xl font-heading font-bold text-white">PaySafe</h1>
          <p className="text-sm text-gray-500 mt-1">AI-powered financial security platform</p>
        </div>

        <div className="glass-panel p-8">
          <div className="flex gap-1 p-1 rounded-xl bg-ink-900/60 border border-ink-600 mb-6">
            <button type="button" onClick={() => { setTab('login'); setErrors({}); }} className={`flex-1 py-2.5 rounded-lg text-sm font-body font-semibold transition-all ${tab === 'login' ? 'bg-cyan/15 text-cyan-glow border border-cyan/30' : 'text-gray-400 hover:text-white'}`}>
              Log In
            </button>
            <button type="button" onClick={() => { setTab('signup'); setErrors({}); }} className={`flex-1 py-2.5 rounded-lg text-sm font-body font-semibold transition-all ${tab === 'signup' ? 'bg-cyan/15 text-cyan-glow border border-cyan/30' : 'text-gray-400 hover:text-white'}`}>
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="input-field pl-10" />
                </div>
                {errors.name && <p className="text-xs text-critical mt-1">{errors.name}</p>}
              </div>
            )}

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input-field pl-10" />
              </div>
              {errors.email && <p className="text-xs text-critical mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-field pl-10" />
              </div>
              {errors.password && <p className="text-xs text-critical mt-1">{errors.password}</p>}
            </div>

            <button type="submit" className="btn-primary w-full">
              {tab === 'login' ? 'Log In' : 'Create Account'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Prototype demo. Authentication is stored locally — no real backend.
        </p>
      </motion.div>
    </div>
  );
}
