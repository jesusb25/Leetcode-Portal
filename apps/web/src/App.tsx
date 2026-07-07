import { lazy, Suspense } from "react";
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
import { useKeepAlive } from "./lib/useKeepAlive";
import { useThemePreference } from "./lib/theme";

const AddProblem = lazy(() =>
  import("./pages/AddProblem").then(({ AddProblem }) => ({
    default: AddProblem,
  })),
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then(({ Dashboard }) => ({ default: Dashboard })),
);
const Landing = lazy(() =>
  import("./pages/Landing").then(({ Landing }) => ({ default: Landing })),
);
const Login = lazy(() =>
  import("./pages/Login").then(({ Login }) => ({ default: Login })),
);
const Privacy = lazy(() =>
  import("./pages/Privacy").then(({ Privacy }) => ({ default: Privacy })),
);
const ProblemDetail = lazy(() =>
  import("./pages/ProblemDetail").then(({ ProblemDetail }) => ({
    default: ProblemDetail,
  })),
);
const ProblemLibrary = lazy(() =>
  import("./pages/ProblemLibrary").then(({ ProblemLibrary }) => ({
    default: ProblemLibrary,
  })),
);
const ReviewLog = lazy(() =>
  import("./pages/ReviewLog").then(({ ReviewLog }) => ({ default: ReviewLog })),
);

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
  useKeepAlive();

  return (
    <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Suspense fallback={<FullScreenSpinner />}>
        <Routes>
          {/* Public — reachable without a session. The homepage and a public
            privacy policy are prerequisites for Google OAuth verification. */}
          <Route path="/" element={<LandingOrApp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/privacy" element={<Privacy />} />

          {/* Protected app */}
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/problems" element={<ProblemLibrary />} />
              <Route path="/reviews" element={<ReviewLog />} />
              <Route path="/problems/new" element={<AddProblem />} />
              <Route path="/problems/:id" element={<ProblemDetail />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

function LandingOrApp() {
  const { session, loading } = useAuth();
  if (supabase && loading) return <FullScreenSpinner />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <Landing />;
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
