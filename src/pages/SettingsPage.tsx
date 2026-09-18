import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon, User, Shield, Lock, Palette,
  Save, Trash2, Bell, AlertTriangle, Mail, History,
} from 'lucide-react';
import { getSettings, setSettings, clearHistory, type AppSettings } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';

interface ToggleProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon: React.ComponentType<{ className?: string }>;
}

function Toggle({ label, description, value, onChange, icon: Icon }: ToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-ink-900/40 border border-cyan/10">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-cyan-glow" />
        </div>
        <div>
          <p className="text-sm font-body font-semibold text-white">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-all shrink-0 ${value ? 'bg-cyan-glow' : 'bg-ink-600'}`}
        role="switch"
        aria-checked={value}
        aria-label={label}
      >
        <motion.span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
          animate={{ left: value ? '26px' : '2px' }}
          transition={{ duration: 0.2 }}
        />
      </button>
    </div>
  );
}

export function SettingsPage() {
  const { user, updateName } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [settings, setSettingsState] = useState<AppSettings>(getSettings);
  const [name, setName] = useState(user?.name ?? '');

  const handleSave = () => {
    const updatedSettings = { ...settings, darkMode: theme === 'dark' };
    setSettings(updatedSettings);
    if (name.trim() && name !== user?.name) {
      updateName(name.trim());
    }
    toast('Settings saved successfully');
  };

  const handleClearHistory = () => {
    clearHistory();
    toast('History cleared');
  };

  const updateSetting = (key: keyof AppSettings, value: boolean) => {
    setSettingsState((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDarkMode = (v: boolean) => {
    setTheme(v ? 'dark' : 'light');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-cyan-glow" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-heading font-bold text-white">Settings</h1>
        </div>
        <p className="text-gray-400">Manage your account, security, and preferences.</p>
      </div>

      {/* Profile */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
            <User className="w-5 h-5 text-cyan-glow" />
          </div>
          <h2 className="text-lg font-heading font-semibold text-white">Profile</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 mb-1.5">Email</label>
            <input type="email" value={user?.email ?? ''} readOnly className="input-field opacity-60 cursor-not-allowed" />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-cyan-glow" />
          </div>
          <h2 className="text-lg font-heading font-semibold text-white">Security</h2>
        </div>
        <div className="space-y-3">
          <Toggle label="Security Notifications" description="Get notified about security events" value={settings.securityNotifications} onChange={(v) => updateSetting('securityNotifications', v)} icon={Bell} />
          <Toggle label="Risk Alerts" description="Receive alerts when high-risk items are detected" value={settings.riskAlerts} onChange={(v) => updateSetting('riskAlerts', v)} icon={AlertTriangle} />
          <Toggle label="Email Notifications" description="Receive security summaries via email" value={settings.emailNotifications} onChange={(v) => updateSetting('emailNotifications', v)} icon={Mail} />
        </div>
      </div>

      {/* Privacy */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-cyan-glow" />
          </div>
          <h2 className="text-lg font-heading font-semibold text-white">Privacy</h2>
        </div>
        <div className="space-y-3">
          <Toggle label="Save Analysis History" description="Store your analyses locally for future reference" value={settings.saveHistory} onChange={(v) => updateSetting('saveHistory', v)} icon={History} />
          <div className="flex items-center justify-between p-4 rounded-xl bg-critical/5 border border-critical/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-critical/10 border border-critical/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-critical" />
              </div>
              <div>
                <p className="text-sm font-body font-semibold text-white">Clear All History</p>
                <p className="text-xs text-gray-500">Delete all saved analyses, alerts, and history</p>
              </div>
            </div>
            <button onClick={handleClearHistory} className="px-4 py-2 rounded-lg text-sm font-body font-semibold text-critical bg-critical/10 hover:bg-critical/20 border border-critical/30 transition-all shrink-0">
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
            <Palette className="w-5 h-5 text-cyan-glow" />
          </div>
          <h2 className="text-lg font-heading font-semibold text-white">Appearance</h2>
        </div>
        <Toggle label="Dark Mode" description="Use dark theme (recommended for this app)" value={theme === 'dark'} onChange={toggleDarkMode} icon={Palette} />
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button onClick={handleSave} className="btn-primary">
          <Save className="w-4 h-4" /> Save Settings
        </button>
      </div>
    </div>
  );
}
