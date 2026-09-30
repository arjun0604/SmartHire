import { useState, useRef, useEffect, useCallback, Fragment } from "react"
import { useAuth0 } from "@auth0/auth0-react"
import { useUser } from "@context/UserContext"
import {
  Mail,
  FileCheck,
  Calendar,
  AlertCircle,
  ExternalLink,
  Phone,
  MapPin,
} from "lucide-react"
import { fetchCandidateResumeApi, getResumeViewUrl, type ResumeBackendResponse, type ParsedSkill } from "@utils/api"
import { ProfessionalProfileSkeleton } from "@components/skeletons/ProfessionalProfileSkeleton"

export function CandidateProfile() {
  const { isLoading: isAuth0Loading, isAuthenticated } = useAuth0();
  const { profile, isLoading: isUserLoading, uploadResume, refreshUser } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState("");
  const [showInitialMessage, setShowInitialMessage] = useState(() => {
    if (typeof window !== "undefined") {
      const justUploaded = sessionStorage.getItem("smarthire_resume_just_uploaded");
      if (justUploaded) {
        sessionStorage.removeItem("smarthire_resume_just_uploaded");
        return true;
      }
    }
    return false;
  });

  const [resumeData, setResumeData] = useState<ResumeBackendResponse | null>(null);
  const [isLoadingResume, setIsLoadingResume] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showRawTextFallback, setShowRawTextFallback] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<ParsedSkill | null>(null);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pollCountRef = useRef(0);

  const parsedDetails = resumeData?.parsed_details;
  const parsingStatus = parsedDetails?.parsing_status;
  const summary = parsedDetails?.summary;
  const rawSkills: ParsedSkill[] = parsedDetails?.skills || [];
  const workExp = parsedDetails?.work_experience || [];
  const education = parsedDetails?.education || [];
  const projects = parsedDetails?.projects || [];
  const certifications = parsedDetails?.certifications || [];
  const rawText = parsedDetails?.raw_text;
  const currentTitle = parsedDetails?.current_title?.trim();
  const careerLevel = parsedDetails?.career_level?.toLowerCase();
  const displayTitle = currentTitle || (careerLevel === "fresher" ? "Fresher" : null);

  const hasStructuredContent =
    parsingStatus === "structured" ||
    Boolean(summary || rawSkills.length > 0 || workExp.length > 0 || education.length > 0 || projects.length > 0 || certifications.length > 0);

  const isFailedStatus = parsingStatus === "failed_structuring" || parsingStatus === "failed_extraction";

  const isResumeProcessing =
    isUploading ||
    showInitialMessage ||
    parsingStatus === "processing" ||
    parsingStatus === "extracted" ||
    (!resumeData && Boolean(profile?.resumeId || profile?.resumeName));

  const isAuth0Ready = !isAuth0Loading && isAuthenticated;
  const isUserReady = isAuth0Ready && !isUserLoading && Boolean(profile);
  const isCandidateReady = isUserReady && Boolean(profile?.candidateId);
  const isProfileDataLoading = !isCandidateReady || isUserLoading || isAuth0Loading || isLoadingResume;

  useEffect(() => {
    if (!showInitialMessage) return;
    if (hasStructuredContent || parsingStatus === "structured" || isFailedStatus) {
      setShowInitialMessage(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowInitialMessage(false);
    }, 7000);
    return () => clearTimeout(timer);
  }, [showInitialMessage, hasStructuredContent, parsingStatus, isFailedStatus]);

  useEffect(() => {
    if (!isProfileDataLoading && !isResumeProcessing) {
      setShowSkeleton(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowSkeleton(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [isProfileDataLoading, isResumeProcessing]);

  const loadResume = useCallback(async () => {
    if (!profile?.candidateId) {
      return;
    }
    setIsLoadingResume(true);
    try {
      const res = await fetchCandidateResumeApi(profile.candidateId);
      setResumeData(res);
      if (res?.parsed_details?.parsing_status === "structured" || res?.parsed_details?.parsing_status === "failed_structuring") {
        setLoadError(null);
      }
    } catch {
      if (!isResumeProcessing && !showInitialMessage) {
        setLoadError("Failed to load resume details. Please check your connection and try again.");
      }
    } finally {
      setIsLoadingResume(false);
    }
  }, [profile?.candidateId, isResumeProcessing, showInitialMessage]);

  useEffect(() => {
    if (isCandidateReady) {
      loadResume();
      return;
    }

    if (isUserReady && !profile?.candidateId && !isResumeProcessing && !showInitialMessage) {
      const timer = setTimeout(() => {
        if (!profile?.candidateId && !isResumeProcessing) {
          setIsLoadingResume(false);
          setLoadError("Unable to load profile. Please check your connection and try again.");
        }
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [isCandidateReady, isUserReady, profile?.candidateId, isResumeProcessing, showInitialMessage, loadResume]);

  useEffect(() => {
    if (!profile?.candidateId) return;
    if (hasStructuredContent || parsingStatus === "structured" || isFailedStatus) return;

    const shouldPoll =
      isUploading ||
      showInitialMessage ||
      parsingStatus === "processing" ||
      parsingStatus === "extracted" ||
      (!resumeData && Boolean(profile?.resumeId || profile?.resumeName));

    if (!shouldPoll) return;

    const intervalId = setInterval(async () => {
      pollCountRef.current += 1;
      try {
        const updated = await fetchCandidateResumeApi(profile.candidateId!);
        if (updated) {
          setResumeData(updated);
          if (
            updated.parsed_details?.parsing_status === "structured" ||
            updated.parsed_details?.parsing_status === "failed_structuring" ||
            updated.parsed_details?.parsing_status === "failed_extraction"
          ) {
            setLoadError(null);
            setIsLoadingResume(false);
          }
        } else if (pollCountRef.current > 25) {
          setLoadError("Unable to load profile. Please check your connection and try again.");
          setIsLoadingResume(false);
        }
      } catch {
        if (pollCountRef.current > 25) {
          setLoadError("Failed to load resume details. Please check your connection and try again.");
          setIsLoadingResume(false);
        }
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [
    profile?.candidateId,
    profile?.resumeId,
    profile?.resumeName,
    isUploading,
    showInitialMessage,
    parsingStatus,
    hasStructuredContent,
    isFailedStatus,
    resumeData,
  ]);

  const handleResumeReplace = async (file: File) => {
    if (!file) return;
    setResumeError("");
    setLoadError(null);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx", "doc"].includes(ext)) {
      setResumeError("Please upload a PDF or DOC/DOCX file");
      return;
    }
    if (file.size === 0) {
      setResumeError("The selected file is empty");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setResumeError("Resume file size must be under 10MB");
      return;
    }
    setIsUploading(true);
    setShowInitialMessage(true);
    pollCountRef.current = 0;
    try {
      const res = await uploadResume(file);
      if (res) {
        setResumeData(res);
        if (
          res.parsed_details?.parsing_status === "structured" ||
          res.parsed_details?.summary ||
          (res.parsed_details?.skills && res.parsed_details.skills.length > 0)
        ) {
          setShowInitialMessage(false);
        }
      }
    } catch {
      setResumeError("Failed to upload resume. Please try again.");
      setShowInitialMessage(false);
    } finally {
      setIsUploading(false);
    }
  };

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

  const hasLeftContent = Boolean(summary || workExp.length > 0 || education.length > 0 || projects.length > 0 || certifications.length > 0);
  const hasRightContent = Boolean(rawSkills.length > 0);

  const renderStatusBadge = () => {
    if (!resumeData && !profile?.resumeName) return null;

    if (parsingStatus === "structured") {
      return null;
    }
    if (parsingStatus === "failed_structuring") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
          <AlertCircle className="size-3 text-amber-600" />
          Structuring Incomplete
        </span>
      );
    }
    if (parsingStatus === "failed_extraction") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          <AlertCircle className="size-3 text-rose-600" />
          Extraction Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-cream text-charcoal border border-[#E6E0D6]">
        Uploaded
      </span>
    );
  };

  const handleRetry = async () => {
    setLoadError(null);
    setIsLoadingResume(true);
    setShowInitialMessage(true);
    pollCountRef.current = 0;
    if (!profile?.candidateId) {
      try {
        await refreshUser();
      } catch {
        setLoadError("Unable to load profile. Please check your connection and try again.");
        setIsLoadingResume(false);
        setShowInitialMessage(false);
      }
    } else {
      await loadResume();
    }
  };

  if (showInitialMessage) {
    return (
      <div className="w-full min-w-0 space-y-4">
        <div className="rounded-xl border border-[#E6E0D6] bg-white p-8 sm:p-14 shadow-2xs flex flex-col items-center justify-center text-center">
          <div className="size-8 rounded-full border-2 border-[#E6E0D6] border-t-terracotta animate-spin mb-4" />
          <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
            Processing your resume…
          </h3>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1.5 max-w-md">
            Extracting your professional background and structuring your profile...
          </p>
        </div>
      </div>
    );
  }

  if (isResumeProcessing || (isProfileDataLoading && !resumeData) || (!hasStructuredContent && !isFailedStatus && !resumeData)) {
    if (!showSkeleton && !isResumeProcessing) return null;
    return <ProfessionalProfileSkeleton />;
  }

  if (loadError && !isResumeProcessing) {
    return (
      <div className="w-full min-w-0 space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-6 flex items-start gap-3">
          <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-charcoal">Unable to Load Profile</h3>
            <p className="text-xs text-[#78716C] mt-1">{loadError}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-terracotta px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-terracotta-dark transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
            {profile?.name || "Candidate Profile"}
          </h2>
          {displayTitle && (
            <p className="text-xs sm:text-sm font-medium text-[#78716C] mt-0.5">
              {displayTitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="rounded-lg border border-[#E6E0D6] bg-cream px-3 py-2 flex items-center gap-2 text-xs text-[#78716C] min-w-0">
            <Mail className="size-3.5 text-terracotta shrink-0" />
            <span className="truncate">{profile?.email || "Email not provided"}</span>
          </div>

          <div className="rounded-lg border border-[#E6E0D6] bg-cream px-3 py-2 flex items-center gap-2 text-xs text-[#78716C] min-w-0">
            <Calendar className="size-3.5 text-terracotta shrink-0" />
            <span className="truncate">DOB: {formatDob(profile?.dob)}</span>
          </div>

          <div className="rounded-lg border border-[#E6E0D6] bg-cream px-3 py-2 flex items-center gap-2 text-xs text-[#78716C] min-w-0">
            <Phone className="size-3.5 text-terracotta shrink-0" />
            <span className="truncate">{profile?.phone || "Phone not provided"}</span>
          </div>

          <div className="rounded-lg border border-[#E6E0D6] bg-cream px-3 py-2 flex items-center gap-2 text-xs text-[#78716C] min-w-0">
            <MapPin className="size-3.5 text-terracotta shrink-0" />
            <span className="truncate">{profile?.location || "Location not specified"}</span>
          </div>
        </div>

        <div className="pt-3 border-t border-[#F0ECE4]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg border border-[#E6E0D6] bg-cream">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileCheck className="size-4 text-terracotta shrink-0" />
              <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
                <span className="text-xs font-semibold text-charcoal truncate">
                  {resumeData?.file_name || profile?.resumeName || "Resume.pdf"}
                </span>
                <span className="text-[11px] text-[#8E877D]">
                  {resumeData?.file_size ? formatFileSize(resumeData.file_size) : ""}
                  {resumeData?.created_at ? ` \u2022 Uploaded ${formatDisplayDate(resumeData.created_at)}` : ""}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
              {renderStatusBadge()}

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleResumeReplace(file);
                }}
              />

              {(resumeData?.file_url || resumeData?.parsed_details?.storage_path || profile?.resumeUrl) && (
                <a
                  href={getResumeViewUrl(resumeData?.file_url || profile?.resumeUrl, resumeData?.parsed_details?.storage_path as string | undefined) || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-charcoal hover:text-terracotta transition-colors"
                >
                  <span>View File</span>
                  <ExternalLink className="size-3" />
                </a>
              )}

              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-terracotta hover:text-terracotta-dark transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUploading ? "Uploading..." : "Replace Resume"}
              </button>
            </div>
          </div>
          {resumeError && (
            <div className="flex items-center justify-between gap-2 mt-1.5">
              <p className="text-xs text-red-600 font-medium">{resumeError}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-terracotta hover:underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {parsingStatus === "failed_structuring" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-charcoal">Structuring Incomplete</h4>
              <p className="text-xs text-[#78716C] mt-0.5">
                Structured resume information could not be generated. Your resume is saved and raw extracted text is available below.
              </p>
            </div>
            {rawText && (
              <button
                type="button"
                onClick={() => setShowRawTextFallback((prev) => !prev)}
                className="text-xs font-medium text-terracotta hover:underline cursor-pointer shrink-0"
              >
                {showRawTextFallback ? "Hide Raw Text" : "View Raw Text"}
              </button>
            )}
          </div>
          {showRawTextFallback && rawText && (
            <pre className="rounded-lg bg-white border border-[#E6E0D6] p-3.5 text-[11px] text-[#57534E] leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap font-mono">
              {rawText}
            </pre>
          )}
        </div>
      )}

      {hasStructuredContent && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
          {hasLeftContent && (
            <div className={`${hasRightContent ? "lg:col-span-8" : "lg:col-span-12"} space-y-4`}>
              {summary && (
                <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs">
                  <h2 className="font-serif text-base font-bold text-charcoal pb-2 border-b border-[#F0ECE4]">
                    Professional Summary
                  </h2>
                  <p className="text-xs sm:text-[13px] text-[#44403C] leading-relaxed pt-2.5">
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
      )}
    </div>
  );
}
