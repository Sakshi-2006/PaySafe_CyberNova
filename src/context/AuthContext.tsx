import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const API_BASE = (import.meta.env.VITE_FRAUD_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  updateProfile: (name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.detail || 'Authentication request failed.');
  return payload as T;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    request<{ user: AuthUser | null }>('/api/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await request<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });
    setUser(data.user);
  };

  const signup = async (name: string, email: string, password: string) => {
    const data = await request<{ user: AuthUser }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
    });
    setUser(data.user);
    return { needsEmailConfirmation: false };
  };

  const updateProfile = async (name: string) => {
    const data = await request<{ user: AuthUser }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: name.trim() }),
    });
    setUser(data.user);
  };

  const logout = async () => {
    await request('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, signup, updateProfile, logout }}>{children}</AuthContext.Provider>;
}
