import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import AppShell from "./components/AppShell";
import AccountManagementPage from "./pages/AccountManagementPage";
import ComputerDetailPage from "./pages/ComputerDetailPage";
import LogbookHistoryPage from "./pages/LogbookHistoryPage";
import LoginPage from "./pages/LoginPage";
import PcLogbookPage from "./pages/PcLogbookPage";
import ProblemReportsPage from "./pages/ProblemReportsPage";
import { ToastProvider } from "./components/ToastProvider";

function LoadingPage() {
  return (
    <div className="auth-page">
      <div className="auth-loading">Loading UIC Admin…</div>
    </div>
  );
}

function RequireAuthentication() {
  const { user, loading, error, reload } = useAuth();

  if (loading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Unable to connect</h1>
          <p>UIC Admin could not check your login session.</p>
          <button className="primary-button" onClick={reload}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function LoginRoute() {
  const { user, loading, error, reload } = useAuth();

  if (loading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Unable to connect</h1>
          <p>UIC Admin could not contact the server.</p>
          <button className="primary-button" onClick={reload}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return user ? <Navigate to="/logbook" replace /> : <LoginPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<RequireAuthentication />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/logbook" replace />} />
          <Route path="/logbook" element={<PcLogbookPage />} />
          <Route path="/history" element={<LogbookHistoryPage />} />
          <Route path="/reports" element={<ProblemReportsPage />} />
          <Route path="/accounts" element={<AccountManagementPage />} />
          <Route path="/computers/:clientGuid" element={<ComputerDetailPage />} />
          <Route path="*" element={<Navigate to="/logbook" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
