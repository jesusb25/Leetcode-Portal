import {
  Navigate,
  Outlet,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import { FullScreenSpinner } from "./components/FullScreenSpinner";
import { Layout } from "./components/Layout";
import { AuthProvider, useAuth } from "./lib/auth";
import { supabase } from "./lib/supabase";
import { useThemePreference } from "./lib/theme";
import { AddProblem } from "./pages/AddProblem";
import { Dashboard } from "./pages/Dashboard";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Privacy } from "./pages/Privacy";
import { ProblemDetail } from "./pages/ProblemDetail";
import { ProblemLibrary } from "./pages/ProblemLibrary";

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

function AppRoutes() {
  // Applies the stored light/dark theme to <html> for the public/auth screens
  // (the in-app toggle lives in Layout, which isn't mounted until signed in).
  useThemePreference();

  return (
    <Router>
      <Routes>
        {/* Public — reachable without a session. The homepage and a public
            privacy policy are prerequisites for Google OAuth verification. */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* Protected app */}
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/problems" element={<ProblemLibrary />} />
            <Route path="/problems/new" element={<AddProblem />} />
            <Route path="/problems/:id" element={<ProblemDetail />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

// Gate for the app's protected routes. When Supabase is configured we require a
// real session and bounce to the login screen otherwise. When it isn't (no
// VITE_SUPABASE_* env vars) we fall through and rely on the API's dev-user
// bypass for local development.
function RequireAuth() {
  const { session, loading } = useAuth();

  if (supabase) {
    if (loading) return <FullScreenSpinner />;
    if (!session) return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
