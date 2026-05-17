import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { DashboardShell } from './components/DashboardShell';

/* Pages */
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import InvestmentsPage from './pages/InvestmentsPage';
import NewInvestmentPage from './pages/NewInvestmentPage';
import ImportInvestmentsPage from './pages/ImportInvestmentsPage';
import TransactionsPage from './pages/TransactionsPage';
import PortfolioPage from './pages/PortfolioPage';
import GoalsPage from './pages/GoalsPage';
import NewGoalPage from './pages/NewGoalPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';

/* Auth-guarded wrapper */
function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--ww-bg)', color: '#fff', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: '2rem', height: '2rem', border: '3px solid rgba(52,211,153,0.15)', borderTop: '3px solid var(--ww-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>Loading...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}

/* Guest-only wrapper (redirect if already logged in) */
function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />

          {/* Guest-only auth pages */}
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Protected dashboard */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/investments" element={<InvestmentsPage />} />
            <Route path="/dashboard/investments/new" element={<NewInvestmentPage />} />
            <Route path="/dashboard/investments/import" element={<ImportInvestmentsPage />} />
            <Route path="/dashboard/transactions" element={<TransactionsPage />} />
            <Route path="/dashboard/portfolio" element={<PortfolioPage />} />
            <Route path="/dashboard/goals" element={<GoalsPage />} />
            <Route path="/dashboard/goals/new" element={<NewGoalPage />} />
            <Route path="/dashboard/notifications" element={<NotificationsPage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
