import { useState, useEffect, useRef, useCallback, Fragment, useMemo } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import {
  ArrowLeft,
  Mail,
  Calendar,
  Phone,
  MapPin,
  FileCheck,
  ExternalLink,
  AlertCircle,
} from "lucide-react"
import { AppSidebar } from "../components/app-sidebar"
import { SidebarInset, SidebarProvider } from "../components/ui/sidebar"
import { SiteHeader } from "../components/site-header"
import {
  getResumeViewUrl,
  fetchCandidateDetailsApi,
  type CandidateDetails,
  type ParsedSkill,
} from "../utils/api"
import { ProfessionalProfileSkeleton } from "../components/skeletons/ProfessionalProfileSkeleton"

export default function RecruiterCandidateProfile() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state || {}) as {
    from?: string;
    fromLabel?: string;
    fromPath?: string;
    jobId?: string;
    applicationId?: string;
    parentFrom?: string;
    parentFromLabel?: string;
    parentFromPath?: string;
    grandparentFrom?: string;
    grandparentFromLabel?: string;
    grandparentFromPath?: string;
  };

  const backDestination = useMemo(() => {
    if (navState.from === "application") {
      return {
        label: navState.fromLabel || "Back to Candidate Application",
        path: navState.fromPath || (navState.jobId && navState.applicationId ? `/candidates/job/${navState.jobId}/application/${navState.applicationId}` : "/dashboard?tab=candidates"),
      };
    }
    if (navState.from === "job-candidates") {
      return {
        label: navState.fromLabel || "Back to Job Candidates",
        path: navState.fromPath || (navState.jobId ? `/candidates/job/${navState.jobId}` : "/dashboard?tab=candidates"),
      };
    }
    if (navState.from === "overview") {
      return {
        label: navState.fromLabel || "Back to Overview",
        path: navState.fromPath || "/dashboard?tab=overview",
      };
    }
    if (navState.fromLabel && navState.fromPath) {
      return {
        label: navState.fromLabel,
        path: navState.fromPath,
      };
    }
    return {
      label: "Back to Candidates",
      path: "/dashboard?tab=candidates",
    };
  }, [navState]);

  const handleBack = () => {
    if (navState.from === "application" && navState.fromPath) {
      navigate(backDestination.path, {
        state: {
          from: navState.parentFrom || "job-candidates",
          fromLabel: navState.parentFromLabel || "Back to Job Candidates",
          fromPath: navState.parentFromPath || (navState.jobId ? `/candidates/job/${navState.jobId}` : "/dashboard?tab=candidates"),
          jobId: navState.jobId,
          applicationId: navState.applicationId,
          parentFrom: navState.grandparentFrom,
          parentFromLabel: navState.grandparentFromLabel,
          parentFromPath: navState.grandparentFromPath,
        },
      });
    } else {
      navigate(backDestination.path);
    }
  };

  const [candidate, setCandidate] = useState<CandidateDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedSkill, setSelectedSkill] = useState<ParsedSkill | null>(null);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const loadData = useCallback(async () => {
    if (!candidateId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchCandidateDetailsApi(candidateId);
      setCandidate(data);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const res = (err as { response?: { status?: number; data?: { detail?: string } } }).response;
        if (res?.status === 403) {
          setErrorMessage("Access denied: This candidate has not applied to any of your job postings.");
        } else if (res?.status === 404) {
          setErrorMessage("Candidate profile not found.");
        } else {
          setErrorMessage(res?.data?.detail || "Failed to load candidate profile.");
        }
      } else {
        setErrorMessage("Failed to load candidate profile.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const parsedDetails = candidate?.resume?.parsed_details;
  const parsingStatus = parsedDetails?.parsing_status;
  const isProcessing = parsingStatus === "processing" || parsingStatus === "extracted";

  useEffect(() => {
    if (!candidateId || !isProcessing) return;
    const intervalId = setInterval(async () => {
      try {
        const data = await fetchCandidateDetailsApi(candidateId);
        setCandidate(data);
      } catch {
      }
    }, 2500);
    return () => clearInterval(intervalId);
  }, [candidateId, isProcessing]);

  const currentTitle = parsedDetails?.current_title?.trim() || candidate?.current_title?.trim();
  const careerLevel = (parsedDetails?.career_level || candidate?.career_level)?.toLowerCase();
  const displayTitle = currentTitle || (careerLevel === "fresher" ? "Fresher" : null);
  const rawSkills: ParsedSkill[] = (
    (parsedDetails?.skills && parsedDetails.skills.length > 0)
      ? parsedDetails.skills
      : ((candidate as any)?.skills || [])
  ).map((s: any) => (typeof s === "string" ? { name: s, type: "explicit", supporting_evidence: "" } : s));
  const workExp = parsedDetails?.work_experience || [];
  const education = parsedDetails?.education || [];
  const projects = parsedDetails?.projects || [];
  const certifications = parsedDetails?.certifications || [];
  const summary = parsedDetails?.summary;

  const findLastInRowIndex = (idx: number, skillsList: ParsedSkill[]): number => {
    const selectedBtn = chipRefs.current[idx];
    if (!selectedBtn) return idx;
    const selectedTop = selectedBtn.offsetTop;
    let lastIdx = idx;
    for (let i = idx + 1; i < skillsList.length; i++) {
      const btn = chipRefs.current[i];
      if (btn && Math.abs(btn.offsetTop - selectedTop) <= 4) {
        lastIdx = i;
      } else {
        break;
      }
    }
    return lastIdx;
  };

  const handleSkillClick = (skill: ParsedSkill, idx: number) => {
    if (selectedSkill?.name === skill.name) {
      setSelectedSkill(null);
      setInsertAfterIndex(null);
      return;
    }
    setSelectedSkill(skill);
    const lastIdx = findLastInRowIndex(idx, rawSkills);
    setInsertAfterIndex(lastIdx);
  };

  useEffect(() => {
    if (!selectedSkill) {
      setInsertAfterIndex(null);
      return;
    }
    const updateIndex = () => {
      const idx = rawSkills.findIndex((s) => s.name === selectedSkill.name);
      if (idx === -1) {
        setInsertAfterIndex(null);
        return;
      }
      setInsertAfterIndex(findLastInRowIndex(idx, rawSkills));
    };

    updateIndex();
    window.addEventListener("resize", updateIndex);
    return () => window.removeEventListener("resize", updateIndex);
  }, [selectedSkill, rawSkills]);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDob = (dobStr?: string) => {
    if (!dobStr) return "Not provided";
    const parts = dobStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dobStr;
  };

  const resumeViewUrl = getResumeViewUrl(
    candidate?.resume?.file_url,
    candidate?.resume?.parsed_details?.storage_path as string | undefined
  );

  const hasLeftContent = Boolean(
    summary ||
    workExp.length > 0 ||
    education.length > 0 ||
    projects.length > 0 ||
    certifications.length > 0
  );
  const hasRightContent = Boolean(rawSkills.length > 0);

  return (
    <SidebarProvider>
      <AppSidebar activeTab="candidates" />
      <SidebarInset className="bg-cream/40 min-h-screen">
        <SiteHeader title="Candidate Profile" />

        <div className="flex flex-1 flex-col gap-4 sm:gap-6 p-3.5 sm:p-6 lg:py-8 lg:pl-28 lg:pr-8 w-full min-w-0">
          <div className="border-b border-[#E6E0D6] pb-3 sm:pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
            <div className="min-w-0">
              <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-charcoal tracking-tight truncate">
                Candidate Profile
              </h1>
            </div>
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#78716C] hover:text-charcoal transition-colors cursor-pointer w-fit self-start sm:self-auto shrink-0"
            >
              <ArrowLeft className="size-4" />
              <span>{backDestination.label}</span>
            </button>
          </div>

          {(isLoading || isProcessing) && !errorMessage && <ProfessionalProfileSkeleton />}

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-6 flex items-start gap-3">
              <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-charcoal">Unable to Load Candidate</h3>
                <p className="text-xs text-[#78716C] mt-1">{errorMessage}</p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => loadData()}
                    className="inline-flex items-center gap-1.5 rounded-md bg-terracotta px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-terracotta-dark transition-colors cursor-pointer"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-xs font-semibold text-[#78716C] hover:text-charcoal transition-colors cursor-pointer"
                  >
                    {backDestination.label}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !errorMessage && !isProcessing && candidate && (
            <div className="w-full min-w-0 space-y-4">
              <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
                      {candidate.name || "Candidate Profile"}
                    </h2>
                    {displayTitle && (
                      <p className="text-xs sm:text-sm font-medium text-[#78716C] mt-0.5">
                        {displayTitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <div className="rounded-lg border border-[#E6E0D6] bg-cream px-3 py-2 flex items-center gap-2 text-xs text-[#78716C] min-w-0">
                    <Mail className="size-3.5 text-terracotta shrink-0" />
                    <span className="truncate">{candidate.email || "Email not provided"}</span>
                  </div>

                  <div className="rounded-lg border border-[#E6E0D6] bg-cream px-3 py-2 flex items-center gap-2 text-xs text-[#78716C] min-w-0">
                    <Calendar className="size-3.5 text-terracotta shrink-0" />
                    <span className="truncate">DOB: {formatDob(candidate.dob || undefined)}</span>
                  </div>

                  <div className="rounded-lg border border-[#E6E0D6] bg-cream px-3 py-2 flex items-center gap-2 text-xs text-[#78716C] min-w-0">
                    <Phone className="size-3.5 text-terracotta shrink-0" />
                    <span className="truncate">{candidate.phone || "Phone not provided"}</span>
                  </div>

                  <div className="rounded-lg border border-[#E6E0D6] bg-cream px-3 py-2 flex items-center gap-2 text-xs text-[#78716C] min-w-0">
                    <MapPin className="size-3.5 text-terracotta shrink-0" />
                    <span className="truncate">{candidate.location || "Location not specified"}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F0ECE4]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg border border-[#E6E0D6] bg-cream">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileCheck className="size-4 text-terracotta shrink-0" />
                      <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-charcoal truncate">
                          {candidate.resume?.file_name || "Resume.pdf"}
                        </span>
                        <span className="text-[11px] text-[#8E877D]">
                          {formatFileSize(candidate.resume?.parsed_details?.file_size)}
                        </span>
                      </div>
                    </div>

                    {resumeViewUrl && (
                      <a
                        href={resumeViewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta hover:text-terracotta-dark transition-colors shrink-0"
                      >
                        <span>View Resume</span>
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
                {hasLeftContent && (
                  <div className={`${hasRightContent ? "lg:col-span-8" : "lg:col-span-12"} space-y-4`}>
                    {summary && (
                      <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs">
                        <h2 className="font-serif text-base font-bold text-charcoal pb-2 border-b border-[#F0ECE4]">
                          Professional Summary
                        </h2>
                        <p className="text-xs sm:text-[13px] text-[#44403C] leading-relaxed pt-2.5 whitespace-pre-line">
                          {summary}
                        </p>
                      </div>
                    )}

                    {workExp.length > 0 && (
                      <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                        <h2 className="font-serif text-base font-bold text-charcoal pb-2 border-b border-[#F0ECE4]">
                          Work Experience
                        </h2>
                        <div className="space-y-4 divide-y divide-[#F0ECE4]">
                          {workExp.map((exp, idx) => {
                            const isCurrent = exp.is_current || exp.end_date?.toLowerCase() === "present";
                            return (
                              <div key={idx} className={idx > 0 ? "pt-4" : ""}>
                                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                                  <div>
                                    <h3 className="text-sm font-semibold text-charcoal">
                                      {exp.title || "Position"}
                                    </h3>
                                    <p className="text-xs font-medium text-terracotta mt-0.5">
                                      {exp.company}
                                      {exp.location && (
                                        <span className="text-[#8E877D] font-normal ml-1.5">&bull; {exp.location}</span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 text-xs text-[#8E877D]">
                                    <span>
                                      {exp.start_date || "Start"} &ndash; {exp.end_date || (isCurrent ? "Present" : "End")}
                                    </span>
                                    {isCurrent && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Current
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {exp.description && (
                                  <p className="text-xs text-[#44403C] mt-2 leading-relaxed">
                                    {exp.description}
                                  </p>
                                )}

                                {exp.responsibilities && exp.responsibilities.length > 0 && (
                                  <ul className="mt-2 space-y-1 text-xs text-[#44403C]">
                                    {exp.responsibilities.map((resp, rIdx) => (
                                      <li key={rIdx} className="flex items-start gap-2 leading-relaxed">
                                        <span className="size-1.5 rounded-full bg-terracotta mt-1.5 shrink-0" />
                                        <span>{resp}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {education.length > 0 && (
                      <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs space-y-3">
                        <h2 className="font-serif text-base font-bold text-charcoal pb-2 border-b border-[#F0ECE4]">
                          Education
                        </h2>
                        <div className="space-y-3 divide-y divide-[#F0ECE4]">
                          {education.map((edu, idx) => (
                            <div key={idx} className={idx > 0 ? "pt-3" : ""}>
                              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                                <div>
                                  <h3 className="text-sm font-semibold text-charcoal">
                                    {edu.degree || "Degree"}
                                    {edu.field_of_study ? ` \u2014 ${edu.field_of_study}` : ""}
                                  </h3>
                                  <p className="text-xs font-medium text-terracotta mt-0.5">
                                    {edu.institution || "Institution"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 text-xs text-[#8E877D]">
                                  {(edu.start_date || edu.end_date) && (
                                    <span>
                                      {edu.start_date ? `${edu.start_date} \u2013 ` : ""}
                                      {edu.end_date || "Present"}
                                    </span>
                                  )}
                                  {edu.grade && (
                                    <span className="px-1.5 py-0.2 rounded bg-cream border border-[#E6E0D6] text-[10.5px] font-medium text-charcoal">
                                      {edu.grade.toLowerCase().includes("grade") || edu.grade.toLowerCase().includes("cgpa") || edu.grade.toLowerCase().includes("gpa")
                                        ? edu.grade
                                        : `Grade: ${edu.grade}`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {projects.length > 0 && (
                      <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
                        <h2 className="font-serif text-base font-bold text-charcoal pb-2 border-b border-[#F0ECE4]">
                          Projects
                        </h2>
                        <div className="space-y-3.5 divide-y divide-[#F0ECE4]">
                          {projects.map((proj, idx) => (
                            <div key={idx} className={idx > 0 ? "pt-3.5" : ""}>
                              <div className="flex items-baseline justify-between gap-2">
                                <h3 className="text-sm font-semibold text-charcoal">
                                  {proj.name || "Project"}
                                </h3>
                                {proj.link && (
                                  <a
                                    href={proj.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-terracotta hover:underline font-medium shrink-0"
                                  >
                                    <span>View Project</span>
                                    <ExternalLink className="size-3" />
                                  </a>
                                )}
                              </div>

                              {proj.description && (
                                <p className="text-xs text-[#44403C] mt-1.5 leading-relaxed">
                                  {proj.description}
                                </p>
                              )}

                              {proj.technologies && proj.technologies.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {proj.technologies.map((tech, tIdx) => (
                                    <span
                                      key={tIdx}
                                      className="px-2 py-0.5 rounded bg-cream border border-[#E6E0D6] text-[10.5px] font-medium text-[#78716C]"
                                    >
                                      {tech}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {certifications.length > 0 && (
                      <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs space-y-2.5">
                        <h2 className="font-serif text-base font-bold text-charcoal pb-2 border-b border-[#F0ECE4]">
                          Certifications
                        </h2>
                        <div className="space-y-2 divide-y divide-[#F0ECE4]">
                          {certifications.map((cert, idx) => (
                            <div key={idx} className={idx > 0 ? "pt-2.5" : ""}>
                              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                                <div>
                                  <h3 className="text-xs sm:text-sm font-semibold text-charcoal">
                                    {cert.name || "Certification"}
                                  </h3>
                                  {cert.issuing_organization && (
                                    <p className="text-xs font-medium text-terracotta mt-0.5">
                                      {cert.issuing_organization}
                                    </p>
                                  )}
                                </div>
                                {(cert.issue_date || cert.credential_id) && (
                                  <div className="flex items-center gap-2 text-xs text-[#8E877D] shrink-0">
                                    {cert.issue_date && <span>Issued {cert.issue_date}</span>}
                                    {cert.credential_id && (
                                      <>
                                        {cert.issue_date && <span>&bull;</span>}
                                        <span>ID: {cert.credential_id}</span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {hasRightContent && (
                  <div className={`${hasLeftContent ? "lg:col-span-4" : "lg:col-span-12"} space-y-4`}>
                    {rawSkills.length > 0 && (
                      <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs space-y-2.5">
                        <h2 className="font-serif text-base font-bold text-charcoal pb-2 border-b border-[#F0ECE4]">
                          Skills
                        </h2>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {rawSkills.map((skill, idx) => {
                            const isInferred = skill.type === "inferred";
                            const isSelected = selectedSkill?.name === skill.name;
                            const isInsertPoint = insertAfterIndex === idx;

                            return (
                              <Fragment key={idx}>
                                <button
                                  ref={(el) => {
                                    chipRefs.current[idx] = el;
                                  }}
                                  type="button"
                                  onClick={() => handleSkillClick(skill, idx)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs cursor-pointer transition-colors ${
                                    isSelected
                                      ? "bg-terracotta/10 border border-terracotta text-terracotta font-semibold ring-1 ring-terracotta/20"
                                      : isInferred
                                      ? "bg-white border border-[#E6E0D6] text-[#57534E] font-medium hover:border-terracotta/40"
                                      : "bg-cream border border-[#E6E0D6] text-charcoal font-medium hover:border-terracotta/40"
                                  }`}
                                >
                                  <span>{skill.name}</span>
                                  {isInferred && (
                                    <span className={`text-[10px] ${isSelected ? "text-terracotta font-medium" : "text-[#8E877D] font-normal"}`}>
                                      &bull; Inferred
                                    </span>
                                  )}
                                </button>

                                {isInsertPoint && selectedSkill && (
                                  <div className="basis-full w-full my-1 p-2 rounded-md bg-cream border border-[#E6E0D6] text-[11.5px] text-[#57534E] flex items-start justify-between gap-1.5 animate-in fade-in duration-150">
                                    <div className="leading-snug min-w-0">
                                      <span className="font-semibold text-charcoal">
                                        {selectedSkill.name}
                                        {selectedSkill.type === "inferred" ? (
                                          <span className="text-[10px] font-medium text-terracotta ml-1">
                                            (Inferred)
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-medium text-[#78716C] ml-1">
                                            (Explicit)
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-[#8E877D] mx-1.5">&bull;</span>
                                      <span className="text-[#8E877D]">Evidence: </span>
                                      <span className="italic">
                                        &ldquo;{selectedSkill.supporting_evidence?.trim() || "Explicitly listed in candidate resume."}&rdquo;
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSkill(null);
                                        setInsertAfterIndex(null);
                                      }}
                                      className="text-xs text-[#8E877D] hover:text-charcoal cursor-pointer shrink-0 px-1 leading-none"
                                      aria-label="Close evidence"
                                    >
                                      &times;
                                    </button>
                                  </div>
                                )}
                              </Fragment>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
