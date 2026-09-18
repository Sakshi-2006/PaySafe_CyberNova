import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getAuth, setAuth, clearAuth } from '@/lib/storage';

interface AuthUser {
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => void;
  signup: (name: string, email: string, password: string) => void;
  updateName: (name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getAuth());
  }, []);

  const login = (email: string, _password: string) => {
    const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const u = { name, email };
    setAuth(u);
    setUser(u);
  };

  const signup = (name: string, email: string, _password: string) => {
    const u = { name, email };
    setAuth(u);
    setUser(u);
  };

  const updateName = (name: string) => {
    if (!user) return;
    const updated = { ...user, name };
    setAuth(updated);
    setUser(updated);
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, updateName, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
