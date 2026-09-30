import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useUser } from "@context/UserContext"
import { useAppDispatch } from "../store"
import { fetchJobsThunk } from "../store/slices/jobsSlice"
import { AppSidebar } from "@components/app-sidebar"
import { SiteHeader } from "@components/site-header"
import { SidebarInset, SidebarProvider } from "@components/ui/sidebar"
import { CandidateOverview } from "@components/candidate/CandidateOverview"
import { CandidateBrowseJobs } from "@components/candidate/CandidateBrowseJobs"
import { CandidateApplications } from "@components/candidate/CandidateApplications"
import { CandidateSavedJobs } from "@components/candidate/CandidateSavedJobs"
import { CandidateAssessments } from "@components/candidate/CandidateAssessments"
import { CandidateProfile } from "@components/candidate/CandidateProfile"

export default function CandidateDashboard() {
  const { profile } = useUser();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      dispatch(fetchJobsThunk());
    }
  }, [dispatch, profile]);
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");

  const tabTitles: Record<string, string> = {
    overview: "Overview",
    jobs: "Browse Jobs",
    applications: "Applications",
    "saved-jobs": "Saved Jobs",
    assessments: "Assessments",
    profile: "Profile & Resume",
  };

  const activeTab = urlTab && tabTitles[urlTab] ? urlTab : "overview";
  const navigateToTab = (tab: string) => navigate(`/dashboard?tab=${tab}`);

  return (
    <SidebarProvider>
      <AppSidebar activeTab={activeTab} />
      <SidebarInset className="bg-cream/40 min-h-screen">
        <SiteHeader title={tabTitles[activeTab] || "Overview"} />

        <div className="flex flex-1 flex-col gap-4 sm:gap-6 p-3.5 sm:p-6 lg:py-8 lg:pl-28 lg:pr-8 w-full min-w-0">
          <div className="border-b border-[#E6E0D6] pb-3 sm:pb-4 min-w-0">
            <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-charcoal tracking-tight truncate">
              {tabTitles[activeTab] || "Overview"}
            </h1>
            {activeTab === "overview" && (
              <p className="text-xs sm:text-sm text-[#78716C] mt-0.5 sm:mt-1 truncate">
                Welcome back, {profile?.name || "Member"}
              </p>
            )}
          </div>

          {activeTab === "overview" && <CandidateOverview onNavigateTab={navigateToTab} />}
          {activeTab === "jobs" && <CandidateBrowseJobs />}
          {activeTab === "applications" && <CandidateApplications />}
          {activeTab === "saved-jobs" && <CandidateSavedJobs />}
          {activeTab === "assessments" && <CandidateAssessments />}
          {activeTab === "profile" && <CandidateProfile />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
