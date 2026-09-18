import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppShell } from '@/components/AppShell';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AnalyzeCenterPage } from '@/pages/AnalyzeCenterPage';
import { MessageAnalyzerPage } from '@/pages/MessageAnalyzerPage';
import { LinkAnalyzerPage } from '@/pages/LinkAnalyzerPage';
import { QrAnalyzerPage } from '@/pages/QrAnalyzerPage';
import { TransactionAnalyzerPage } from '@/pages/TransactionAnalyzerPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { RiskHistoryPage } from '@/pages/RiskHistoryPage';
import { IntelligencePage } from '@/pages/IntelligencePage';
import { SettingsPage } from '@/pages/SettingsPage';
import type { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/analyze" element={<AnalyzeCenterPage />} />
        <Route path="/analyze/message" element={<MessageAnalyzerPage />} />
        <Route path="/analyze/link" element={<LinkAnalyzerPage />} />
        <Route path="/analyze/qr" element={<QrAnalyzerPage />} />
        <Route path="/analyze/transaction" element={<TransactionAnalyzerPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/risk-history" element={<RiskHistoryPage />} />
        <Route path="/intelligence" element={<IntelligencePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
