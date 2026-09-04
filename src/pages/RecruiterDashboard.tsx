import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { useUser } from "@context/UserContext"
import { AppSidebar } from "@components/app-sidebar"
import { SiteHeader } from "@components/site-header"
import { SidebarInset, SidebarProvider } from "@components/ui/sidebar"
import { Plus } from "lucide-react"
import { useAppDispatch } from "../store"
import { addJob, type Job } from "../store/slices/jobsSlice"
import { RecruiterOverview } from "@components/recruiter/RecruiterOverview"
import { RecruiterPostings } from "@components/recruiter/RecruiterPostings"
import { RecruiterCandidates } from "@components/recruiter/RecruiterCandidates"
import { RecruiterAssessments } from "@components/recruiter/RecruiterAssessments"
import { RecruiterCompanyProfile } from "@components/recruiter/RecruiterCompanyProfile"
import { CreateJobModal } from "@components/recruiter/CreateJobModal"
import { usePermissions } from "../hooks/usePermissions"

export default function RecruiterDashboard() {
  const { profile } = useUser();
  const { hasPermission } = usePermissions();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(urlTab || "overview");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const companyName = profile?.company || "Meridian Labs";

  const tabTitles: Record<string, string> = {
    overview: "Overview",
    postings: "Job Postings",
    candidates: "Candidates",
    assessments: "Assessments",
    company: "Company Profile",
  };

  useEffect(() => {
    if (urlTab && tabTitles[urlTab]) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleJobCreated = (newJob: Omit<Job, "company" | "matchScore">) => {
    dispatch(
      addJob({
        ...newJob,
        company: companyName,
        matchScore: 85,
      })
    );
  };

  return (
    <SidebarProvider>
      <AppSidebar activeTab={activeTab} onSelectTab={setActiveTab} />
      <SidebarInset className="bg-cream/40 min-h-screen">
        <SiteHeader title={tabTitles[activeTab] || "Overview"} />

        <div className="flex flex-1 flex-col gap-4 sm:gap-6 p-3.5 sm:p-6 lg:py-8 lg:pl-28 lg:pr-8 w-full min-w-0">
          <div className="border-b border-[#E6E0D6] pb-3 sm:pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
            <div className="min-w-0">
              <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-charcoal tracking-tight truncate">
                {tabTitles[activeTab] || "Overview"}
              </h1>
              {activeTab === "overview" && (
                <p className="text-xs sm:text-sm text-[#78716C] mt-0.5 sm:mt-1 truncate">
                  Welcome, {profile?.name}
                </p>
              )}
            </div>

            {activeTab === "postings" && hasPermission("create:jobs") && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="rounded-md bg-terracotta px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white shadow-2xs hover:bg-terracotta-dark transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0"
              >
                <Plus className="size-3.5 sm:size-4" />
                <span>Create New Job</span>
              </button>
            )}
          </div>

          {activeTab === "overview" && <RecruiterOverview onNavigateTab={setActiveTab} />}

          {activeTab === "postings" && (
            <RecruiterPostings
              companyName={companyName}
              onNavigateTab={setActiveTab}
              onOpenCreateJob={() => setIsCreateModalOpen(true)}
            />
          )}

          {activeTab === "candidates" && (
            <RecruiterCandidates
              onRejectCandidate={() => {}}
              onShortlistCandidate={() => {}}
              onScheduleInterview={() => {}}
            />
          )}

          {activeTab === "assessments" && (
            <RecruiterAssessments onCreateAssessment={() => {}} />
          )}

          {activeTab === "company" && <RecruiterCompanyProfile />}
        </div>
      </SidebarInset>

      <CreateJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onJobCreated={handleJobCreated}
      />
    </SidebarProvider>
  );
}
