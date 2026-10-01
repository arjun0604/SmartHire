import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Building2, MapPin, Calendar, ArrowUpRight, CheckCircle2, Clock, Play } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store";
import { fetchCandidateApplicationsThunk } from "../../store/slices/applicationsSlice";
import { useUser } from "../../context/UserContext";
import { formatDisplayDate, getApplicationStatusBadgeClass } from "../../utils/formatters";
import { fetchCandidateAssessmentsApi, CandidateAssessmentListItem } from "../../utils/api";

export function CandidateApplications() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { profile } = useUser();
  const applications = useAppSelector((state) => state.applications.candidateApplications) || [];
  const jobs = useAppSelector((state) => state.jobs.jobs) || [];

  const [assessmentMap, setAssessmentMap] = useState<Record<string, CandidateAssessmentListItem>>({});

  useEffect(() => {
    if (profile?.candidateId) {
      dispatch(fetchCandidateApplicationsThunk(profile.candidateId));
    }
  }, [dispatch, profile?.candidateId]);

  useEffect(() => {
    fetchCandidateAssessmentsApi()
      .then((items) => {
        const map: Record<string, CandidateAssessmentListItem> = {};
        items.forEach((item) => {
          map[item.application_id] = item;
        });
        setAssessmentMap(map);
      })
      .catch(() => {});
  }, []);

  const candidateApps = profile?.candidateId
    ? applications.filter((app) => app.candidate_id === profile.candidateId)
    : applications;

  const getJobForApplication = (jobId: string) => {
    return jobs.find((j) => j.id === jobId);
  };

  const handleOpenApplication = (applicationId: string) => {
    navigate(`/candidate/applications/${applicationId}`, {
      state: {
        from: "applications",
        fromLabel: "Back to My Applications",
        fromPath: "/dashboard?tab=applications",
      },
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div>
          <h2 className="font-serif text-base sm:text-lg font-bold text-charcoal">
            My Submitted Applications
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Review your submitted applications and evaluated role matches.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-cream border border-[#E6E0D6] text-charcoal flex items-center gap-1.5 self-start sm:self-auto shrink-0">
          <FileText className="size-3.5 text-terracotta" />
          <span>{candidateApps.length} Submitted</span>
        </span>
      </div>

      {candidateApps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E6E0D6] bg-white p-8 sm:p-12 text-center space-y-2.5">
          <FileText className="size-10 text-[#A8A199] mx-auto" />
          <h3 className="font-serif text-base font-semibold text-charcoal">No Applications Submitted Yet</h3>
          <p className="text-xs text-[#78716C] max-w-sm mx-auto">
            Browse through active job postings and submit your application to start tracking your progress here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
          {candidateApps.map((app) => {
            const job = getJobForApplication(app.job_id);
            const jobTitle = app.job_title || job?.title || "Job Position";
            const company = app.company_name || job?.company || "Company";
            const location = job?.location || app.job_location || "Remote";
            const assessment = assessmentMap[app.id];
            const hasAssessmentRequirement = Boolean(assessment || job?.requireAssessment);

            return (
              <div
                key={app.id}
                onClick={() => handleOpenApplication(app.id)}
                className="rounded-2xl border border-[#EBE6DD] bg-white p-5 shadow-2xs hover:shadow-xs hover:border-terracotta/40 transition-all cursor-pointer flex flex-col justify-between h-full group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getApplicationStatusBadgeClass(
                        app.status
                      )}`}
                    >
                      {app.status}
                    </span>
                    <span className="text-[11px] text-[#8E877D] flex items-center gap-1">
                      <Calendar className="size-3" />
                      <span>{formatDisplayDate(app.applied_at)}</span>
                    </span>
                  </div>

                  <h3 className="font-serif text-base font-bold text-charcoal group-hover:text-terracotta transition-colors line-clamp-1">
                    {jobTitle}
                  </h3>

                  <div className="mt-2 space-y-1.5 text-xs text-[#78716C]">
                    <p className="flex items-center gap-1.5 font-medium text-charcoal truncate">
                      <Building2 className="size-3.5 text-[#8E877D] shrink-0" />
                      <span>{company}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-[11px] text-[#8E877D] truncate">
                      <MapPin className="size-3.5 text-[#8E877D] shrink-0" />
                      <span>{location}</span>
                    </p>
                  </div>

                  {hasAssessmentRequirement && (
                    <div className="mt-3 p-2.5 rounded-xl bg-cream border border-[#E6E0D6] text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-charcoal text-[11px] flex items-center gap-1">
                          <span>MCQ Assessment:</span>
                        </span>
                        {assessment?.status === "Completed" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="size-3" />
                            <span>Completed</span>
                          </span>
                        ) : assessment?.status === "In Progress" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                            <Clock className="size-3" />
                            <span>In Progress</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <Clock className="size-3" />
                            <span>Pending</span>
                          </span>
                        )}
                      </div>

                      {assessment?.status === "Completed" && (
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#78716C]">
                          <span>Score:</span>
                          <span className="font-semibold text-emerald-800">
                            {assessment.score ?? 0} / {assessment.total_questions} ({assessment.total_questions > 0 ? Math.round(((assessment.score ?? 0) / assessment.total_questions) * 100) : 0}%)
                          </span>
                        </div>
                      )}

                      {assessment?.status === "In Progress" && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/candidate/jobs/${app.job_id}/assessment`);
                            }}
                            className="w-full py-1 px-2.5 rounded-lg bg-charcoal hover:bg-black text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <span>Continue Assessment</span>
                            <ArrowUpRight className="size-3" />
                          </button>
                        </div>
                      )}

                      {assessment?.status === "Pending" && assessment.can_start && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/candidate/jobs/${app.job_id}/assessment`);
                            }}
                            className="w-full py-1 px-2.5 rounded-lg bg-terracotta hover:bg-terracotta-dark text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Play className="size-3" />
                            <span>Take Assessment</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3.5 pt-3 border-t border-[#F0ECE4] text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#8E877D]">{app.is_currently_employed ? "Current Job" : "Most Recent Job"}</span>
                      <span className="font-medium text-charcoal truncate max-w-42.5">
                        {app.current_job_title || "Candidate"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#8E877D]">Resume</span>
                      <span className="font-mono text-charcoal truncate max-w-42.5">
                        {app.resume_name || "Submitted_Resume.pdf"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F0ECE4] flex items-center justify-between">
                  <div>
                    {typeof app.overall_score === "number" && !isNaN(app.overall_score) ? (
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {Math.round(app.overall_score)}% Match
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#8E877D] italic">Match pending</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-terracotta group-hover:underline flex items-center gap-1">
                    <span>View Application</span>
                    <ArrowUpRight className="size-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
