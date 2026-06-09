import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider, useAuth } from "./lib/auth";
import { supabase } from "./lib/supabase";
import { useThemePreference } from "./lib/theme";
import { AddProblem } from "./pages/AddProblem";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { ProblemDetail } from "./pages/ProblemDetail";
import { ProblemLibrary } from "./pages/ProblemLibrary";

export function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

// When Supabase is configured, require a real session and render the login
// screen until the user signs in. When it isn't (no VITE_SUPABASE_* env vars),
// fall through to the app and rely on the API's dev-user bypass for local dev.
function AuthGate() {
  const { session, loading } = useAuth();
  // Applies the stored light/dark theme to <html> for the login/spinner screens
  // (the in-app toggle lives in Layout, which isn't mounted until signed in).
  useThemePreference();

  if (supabase) {
    if (loading) return <FullScreenSpinner />;
    if (!session) return <Login />;
  }

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/problems" element={<ProblemLibrary />} />
          <Route path="/problems/new" element={<AddProblem />} />
          <Route path="/problems/:id" element={<ProblemDetail />} />
        </Route>
      </Routes>
    </Router>
  );
}

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-gray-950">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900 dark:border-gray-700 dark:border-t-gray-100"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
