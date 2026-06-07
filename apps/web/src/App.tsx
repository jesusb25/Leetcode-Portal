import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AddProblem } from "./pages/AddProblem";
import { Dashboard } from "./pages/Dashboard";
import { ProblemDetail } from "./pages/ProblemDetail";
import { ProblemLibrary } from "./pages/ProblemLibrary";

export function App() {
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
