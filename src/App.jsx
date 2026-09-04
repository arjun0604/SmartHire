import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import SignUp from "./pages/SignUp"
import Login from "./pages/Login"
import RecruiterOnboarding from "./pages/RecruiterOnboarding"
import CandidateOnboarding from "./pages/CandidateOnboarding"
import CandidateDashboard from "./pages/CandidateDashboard"
import RecruiterDashboard from "./pages/RecruiterDashboard"
import RecruiterJobDetails from "./pages/RecruiterJobDetails"
import NotFound from "./pages/NotFound"
import { ErrorBoundary } from "./components/error-boundary"
import { useUser } from "./context/UserContext"
import { useIdleTimeout } from "./hooks/useIdleTimeout"

function getHomeRoute(profile) {
  if (!profile) return "/login";
  if (profile.onboardingCompleted) return "/dashboard";
  return profile.role === "recruiter" ? "/recruiter-onboarding" : "/candidate-onboarding";
}

function PublicRoute({ children }) {
  const { isLoading } = useAuth0();
  const { profile } = useUser();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="size-6 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (profile) return <Navigate to={getHomeRoute(profile)} replace />;
  return children;
}

function ProtectedRoute({ children, requireOnboarding = true, targetRole }) {
  const { isLoading } = useAuth0();
  const { profile } = useUser();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="size-6 border-2 border-terracotta border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!profile) return <Navigate to="/login" replace />;

  if (requireOnboarding && !profile.onboardingCompleted) {
    return <Navigate to={getHomeRoute(profile)} replace />;
  }

  if (!requireOnboarding && profile.onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  if (targetRole && profile.role !== targetRole) {
    return <Navigate to={getHomeRoute(profile)} replace />;
  }

  return typeof children === "function" ? children(profile) : children;
}

function App() {
  useIdleTimeout({ timeoutSeconds: 900 });

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicRoute><Navigate to="/login" replace /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/recruiter-onboarding"
            element={
              <ProtectedRoute requireOnboarding={false} targetRole="recruiter">
                <RecruiterOnboarding />
              </ProtectedRoute>
            }
          />
          <Route path="/candidate-onboarding"
            element={
              <ProtectedRoute requireOnboarding={false} targetRole="candidate">
                <CandidateOnboarding />
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard"
            element={
              <ProtectedRoute>
                {(profile) => profile.role === "recruiter" ? <RecruiterDashboard /> : <CandidateDashboard />}
              </ProtectedRoute>
            }
          />
          <Route path="/recruiter/jobs/:jobId"
            element={
              <ProtectedRoute>
                <RecruiterJobDetails />
              </ProtectedRoute>
            }
          />
          <Route path="/candidate/jobs/:jobId"
            element={
              <ProtectedRoute>
                <RecruiterJobDetails />
              </ProtectedRoute>
            }
          />
          <Route path="/jobs/:jobId"
            element={
              <ProtectedRoute>
                <RecruiterJobDetails />
              </ProtectedRoute>
            }
          />
          <Route path="/recruiter" element={<Navigate to="/dashboard?tab=overview" replace />} />
          <Route path="/recruiter/overview" element={<Navigate to="/dashboard?tab=overview" replace />} />
          <Route path="/recruiter/dashboard" element={<Navigate to="/dashboard?tab=overview" replace />} />
          <Route path="/recruiter/jobs" element={<Navigate to="/dashboard?tab=postings" replace />} />
          <Route path="/recruiter/candidates" element={<Navigate to="/dashboard?tab=candidates" replace />} />
          <Route path="/recruiter/candidates/:candidateId" element={<Navigate to="/dashboard?tab=candidates" replace />} />
          <Route path="/recruiter/assessments" element={<Navigate to="/dashboard?tab=assessments" replace />} />
          <Route path="/recruiter/company" element={<Navigate to="/dashboard?tab=company" replace />} />
          <Route path="/candidate" element={<Navigate to="/dashboard?tab=overview" replace />} />
          <Route path="/candidate/overview" element={<Navigate to="/dashboard?tab=overview" replace />} />
          <Route path="/candidate/dashboard" element={<Navigate to="/dashboard?tab=overview" replace />} />
          <Route path="/candidate/jobs" element={<Navigate to="/dashboard?tab=jobs" replace />} />
          <Route path="/candidate/applications" element={<Navigate to="/dashboard?tab=overview" replace />} />
          <Route path="/candidate/saved-jobs" element={<Navigate to="/dashboard?tab=saved-jobs" replace />} />
          <Route path="/candidate/assessments" element={<Navigate to="/dashboard?tab=assessments" replace />} />
          <Route path="/candidate/profile" element={<Navigate to="/dashboard?tab=profile" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

