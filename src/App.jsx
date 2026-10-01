import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuth0 } from "@auth0/auth0-react"
import SignUp from "./pages/SignUp"
import Login from "./pages/Login"
import RecruiterOnboarding from "./pages/RecruiterOnboarding"
import CandidateOnboarding from "./pages/CandidateOnboarding"
import CandidateDashboard from "./pages/CandidateDashboard"
import RecruiterDashboard from "./pages/RecruiterDashboard"
import JobDetails from "./pages/JobDetails"
import AccountProfile from "./pages/AccountProfile"
import RecruiterCandidateProfile from "./pages/RecruiterCandidateProfile"
import JobCandidatesPage from "./pages/JobCandidatesPage"
import RecruiterApplicationDetailPage from "./pages/RecruiterApplicationDetailPage"
import CandidateApplicationDetailPage from "./pages/CandidateApplicationDetailPage"
import CandidateCompanyDetails from "./pages/CandidateCompanyDetails"
import RecruiterQuestionBankPage from "./pages/RecruiterQuestionBankPage"
import RecruiterAssessmentResultsPage from "./pages/RecruiterAssessmentResultsPage"
import CandidateAssessmentPage from "./pages/CandidateAssessmentPage"
import NotFound from "./pages/NotFound"
import { ErrorBoundary } from "./components/error-boundary"
import { Toaster } from "sonner"
import { useUser } from "./context/UserContext"
import { useIdleTimeout } from "./hooks/useIdleTimeout"

import { AuthLoadingPage } from "./components/common/AuthLoadingPage"

function isAuthCallbackPending() {
  if (typeof window === "undefined") return false;
  const search = window.location.search;
  return (search.includes("code=") || search.includes("error=")) && search.includes("state=");
}

function getHomeRoute(profile) {
  if (!profile) return "/login";
  if (profile.onboardingCompleted) return "/dashboard";
  return profile.role === "recruiter" ? "/recruiter-onboarding" : "/candidate-onboarding";
}

function PublicRoute({ children }) {
  const { isLoading, isAuthenticated } = useAuth0();
  const { profile, isLoading: isProfileLoading } = useUser();
  const pending = isAuthCallbackPending();

  if (isLoading || isProfileLoading || isAuthenticated || pending) {
    if (profile) return <Navigate to={getHomeRoute(profile)} replace />;
    return <AuthLoadingPage />;
  }
  return children;
}

function ProtectedRoute({ children, requireOnboarding = true, targetRole }) {
  const { isLoading, isAuthenticated } = useAuth0();
  const { profile, isLoading: isProfileLoading } = useUser();
  const pending = isAuthCallbackPending();

  if (isLoading || isProfileLoading || pending) {
    return <AuthLoadingPage />;
  }
  if (!isAuthenticated && !profile) return <Navigate to="/login" replace />;
  if (!profile) return <AuthLoadingPage />;

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
      <BrowserRouter basename="/SmartHire">
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
                <JobDetails />
              </ProtectedRoute>
            }
          />
          <Route path="/candidate/jobs/:jobId"
            element={
              <ProtectedRoute>
                <JobDetails />
              </ProtectedRoute>
            }
          />
          <Route path="/jobs/:jobId"
            element={
              <ProtectedRoute>
                <JobDetails />
              </ProtectedRoute>
            }
          />
          <Route path="/company/:companyId"
            element={
              <ProtectedRoute>
                <CandidateCompanyDetails />
              </ProtectedRoute>
            }
          />
          <Route path="/recruiter" element={<Navigate to="/dashboard?tab=overview" replace />} />
          <Route path="/recruiter/overview" element={<Navigate to="/dashboard?tab=overview" replace />} />
          <Route path="/recruiter/dashboard" element={<Navigate to="/dashboard?tab=overview" replace />} />
          <Route path="/recruiter/jobs" element={<Navigate to="/dashboard?tab=postings" replace />} />
          <Route path="/recruiter/candidates" element={<Navigate to="/dashboard?tab=candidates" replace />} />
          <Route
            path="/recruiter/candidates/:candidateId"
            element={
              <ProtectedRoute targetRole="recruiter">
                <RecruiterCandidateProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidates/job/:jobId"
            element={
              <ProtectedRoute targetRole="recruiter">
                <JobCandidatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidates/job/:jobId/application/:applicationId"
            element={
              <ProtectedRoute targetRole="recruiter">
                <RecruiterApplicationDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruiter/jobs/:jobId/questions"
            element={
              <ProtectedRoute targetRole="recruiter">
                <RecruiterQuestionBankPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs/:jobId/questions"
            element={
              <ProtectedRoute targetRole="recruiter">
                <RecruiterQuestionBankPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruiter/jobs/:jobId/assessment"
            element={
              <ProtectedRoute targetRole="recruiter">
                <RecruiterQuestionBankPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recruiter/jobs/:jobId/assessment/results"
            element={
              <ProtectedRoute targetRole="recruiter">
                <RecruiterAssessmentResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs/:jobId/assessment/results"
            element={
              <ProtectedRoute targetRole="recruiter">
                <RecruiterAssessmentResultsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/recruiter/assessments" element={<Navigate to="/dashboard?tab=assessments" replace />} />
          <Route path="/recruiter/company" element={<Navigate to="/dashboard?tab=company" replace />} />
          <Route path="/candidate" element={<Navigate to="/dashboard?tab=overview" replace />} />
          <Route path="/candidate/overview" element={<Navigate to="/dashboard?tab=overview" replace />} />
          <Route path="/candidate/dashboard" element={<Navigate to="/dashboard?tab=overview" replace />} />
          <Route path="/candidate/jobs" element={<Navigate to="/dashboard?tab=jobs" replace />} />
          <Route
            path="/candidate/applications/:applicationId"
            element={
              <ProtectedRoute targetRole="candidate">
                <CandidateApplicationDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/jobs/:jobId/application/:applicationId"
            element={
              <ProtectedRoute targetRole="candidate">
                <CandidateApplicationDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/jobs/:jobId/assessment"
            element={
              <ProtectedRoute targetRole="candidate">
                <CandidateAssessmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/assessment-attempts/:attemptId"
            element={
              <ProtectedRoute targetRole="candidate">
                <CandidateAssessmentPage />
              </ProtectedRoute>
            }
          />
          <Route path="/candidate/applications" element={<Navigate to="/dashboard?tab=applications" replace />} />
          <Route path="/candidate/saved-jobs" element={<Navigate to="/dashboard?tab=saved-jobs" replace />} />
          <Route path="/candidate/assessments" element={<Navigate to="/dashboard?tab=assessments" replace />} />
          <Route path="/candidate/profile" element={<Navigate to="/dashboard?tab=profile" replace />} />
          <Route path="/account"
            element={
              <ProtectedRoute>
                <AccountProfile />
              </ProtectedRoute>
            }
          />
          <Route path="/account-profile" element={<Navigate to="/account" replace />} />
          <Route path="/candidate/account" element={<Navigate to="/account" replace />} />
          <Route path="/recruiter/account" element={<Navigate to="/account" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </ErrorBoundary>
  );
}

export default App;
