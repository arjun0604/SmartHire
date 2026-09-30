export function formatDisplayDate(dateStr?: string | Date | null, fallback: string = "Recently"): string {
  if (!dateStr) return fallback;
  try {
    const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return fallback;
  }
}

export function formatDate(isoString?: string | Date | null): string | null {
  if (!isoString) return null;
  try {
    const d = typeof isoString === "string" ? new Date(isoString) : isoString;
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

export function formatDateTime(isoString?: string | Date | null): string {
  if (!isoString) return "—";
  try {
    const d = typeof isoString === "string" ? new Date(isoString) : isoString;
    if (isNaN(d.getTime())) return "—";
    return `${d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} at ${d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })}`;
  } catch {
    return "—";
  }
}

export function getApplicationStatusBadgeClass(status?: string): string {
  switch (status) {
    case "Shortlisted":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "Rejected":
      return "bg-red-50 text-red-800 border-red-200";
    case "Screening":
      return "bg-purple-50 text-purple-800 border-purple-200";
    default:
      return "bg-blue-50 text-blue-800 border-blue-200";
  }
}

export function getInitials(name?: string): string {
  if (!name) return "SH";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function calculateAge(dateOfBirth?: string | Date | null): number | null {
  if (!dateOfBirth) return null;
  try {
    let birthYear: number;
    let birthMonth: number;
    let birthDay: number;

    if (typeof dateOfBirth === "string") {
      const parts = dateOfBirth.split("T")[0].split("-");
      if (parts.length === 3) {
        birthYear = parseInt(parts[0], 10);
        birthMonth = parseInt(parts[1], 10) - 1;
        birthDay = parseInt(parts[2], 10);
      } else {
        const d = new Date(dateOfBirth);
        if (isNaN(d.getTime())) return null;
        birthYear = d.getFullYear();
        birthMonth = d.getMonth();
        birthDay = d.getDate();
      }
    } else {
      if (isNaN(dateOfBirth.getTime())) return null;
      birthYear = dateOfBirth.getFullYear();
      birthMonth = dateOfBirth.getMonth();
      birthDay = dateOfBirth.getDate();
    }

    if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return null;

    const today = new Date();
    let age = today.getFullYear() - birthYear;
    const monthDiff = today.getMonth() - birthMonth;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDay)) {
      age--;
    }
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

export function getHistoryActor(entry: { changed_by?: string | null; from_status?: string | null }): string {
  if (!entry.changed_by) {
    return "—";
  }
  if (!entry.from_status) {
    return "Candidate";
  }
  return "Recruiter";
}

export function getMatchAlignmentBadge(score: number): { label: string; style: string } {
  if (score >= 80) {
    return { label: "Strong Match", style: "text-[#2D5A27] bg-[#EAEFEA] border-[#CCDBC9]" };
  }
  if (score >= 60) {
    return { label: "Moderate Match", style: "text-[#7A5813] bg-[#F7F2EB] border-[#EADBBD]" };
  }
  return { label: "Needs Review", style: "text-terracotta bg-[#FDF0EC] border-[#F1D0C5]" };
}

export function formatExperienceDisplay(months?: number | null, years?: number | null): string {
  let m: number;
  if (months !== undefined && months !== null && !isNaN(months)) {
    m = Math.max(0, Math.round(months));
  } else if (years !== undefined && years !== null && !isNaN(years)) {
    m = Math.max(0, Math.round(years * 12));
  } else {
    return "0 months";
  }

  if (m === 0) return "0 months";
  if (m === 1) return "1 month";
  if (m < 12) return `${m} months`;

  const y = Math.floor(m / 12);
  const rem = m % 12;

  const yStr = y === 1 ? "1 year" : `${y} years`;
  if (rem === 0) return yStr;
  const mStr = rem === 1 ? "1 month" : `${rem} months`;
  return `${yStr} ${mStr}`;
}

export interface ExperienceAssessmentResult {
  requiredText: string;
  candidateText: string;
  assessmentText: string;
  isMet: boolean;
}

export function getExperienceAssessment(experience?: Record<string, any> | null): ExperienceAssessmentResult {
  if (!experience) {
    return {
      requiredText: "Not specified",
      candidateText: "0 months",
      assessmentText: "Experience details not evaluated",
      isMet: false,
    };
  }

  const candMonths =
    experience.candidate_months !== undefined && experience.candidate_months !== null
      ? Number(experience.candidate_months)
      : experience.effective_years !== undefined && experience.effective_years !== null
      ? Math.round(Number(experience.effective_years) * 12)
      : experience.resume_years !== undefined && experience.resume_years !== null
      ? Math.round(Number(experience.resume_years) * 12)
      : 0;

  const reqMonths =
    experience.required_months !== undefined && experience.required_months !== null
      ? Number(experience.required_months)
      : experience.required_years !== undefined && experience.required_years !== null
      ? Math.round(Number(experience.required_years) * 12)
      : 0;

  const diffMonths =
    experience.difference_months !== undefined && experience.difference_months !== null
      ? Number(experience.difference_months)
      : candMonths - reqMonths;

  const isMet = experience.meets_requirement !== undefined ? Boolean(experience.meets_requirement) : candMonths >= reqMonths;

  const requiredText = formatExperienceDisplay(reqMonths);
  const candidateText = formatExperienceDisplay(candMonths);

  let assessmentText: string;
  if (reqMonths === 0) {
    assessmentText = "Requirement met (No minimum required)";
  } else if (diffMonths < 0) {
    const shortfall = formatExperienceDisplay(Math.abs(diffMonths));
    assessmentText = `${shortfall} below requirement`;
  } else if (diffMonths === 0) {
    assessmentText = "Requirement met";
  } else {
    assessmentText = "Requirement met";
  }

  return {
    requiredText,
    candidateText,
    assessmentText,
    isMet,
  };
}

export interface EducationAssessmentResult {
  requiredText: string;
  candidateText: string;
  assessmentText: string;
  isMet: boolean;
}

export function getEducationAssessment(education?: Record<string, any> | null): EducationAssessmentResult {
  if (!education) {
    return {
      requiredText: "Not specified",
      candidateText: "Not specified",
      assessmentText: "Education details not evaluated",
      isMet: false,
    };
  }

  const requiredText = education.required_level || "Not specified";
  const candidateText = education.candidate_level || "Not specified";

  const isReqNotSpecified =
    !education.required_level ||
    education.required_level.toLowerCase().includes("not specified") ||
    education.required_level.toLowerCase() === "none";

  let isMet = false;
  let assessmentText = "Requirement met";

  if (isReqNotSpecified) {
    isMet = true;
    assessmentText = "Requirement met (No specific degree required)";
  } else if (education.score !== undefined && education.score !== null) {
    const score = Number(education.score);
    if (score >= 100) {
      isMet = true;
      assessmentText = "Requirement met";
    } else if (score > 0) {
      isMet = false;
      assessmentText = "Below requirement";
    } else {
      isMet = false;
      assessmentText = "Requirement not met";
    }
  } else {
    if (candidateText && candidateText.toLowerCase() !== "not specified") {
      isMet = true;
      assessmentText = "Requirement met";
    } else {
      isMet = false;
      assessmentText = "Requirement not met";
    }
  }

  return {
    requiredText,
    candidateText,
    assessmentText,
    isMet,
  };
}

export interface StructuredReviewPoint {
  label?: string;
  text: string;
}

export function extractStructuredSemanticReview(
  semantic: Record<string, any> | null | undefined
): StructuredReviewPoint[] {
  if (!semantic) return [];

  if (Array.isArray(semantic.structured_review) && semantic.structured_review.length > 0) {
    return semantic.structured_review
      .filter((item: any) => item && (item.text || item.summary))
      .map((item: any) => ({
        label: item.label || undefined,
        text: item.text || item.summary,
      }));
  }

  const points: StructuredReviewPoint[] = [];

  const eduSummary =
    (Array.isArray(semantic.education_analysis) && semantic.education_analysis[0]) ||
    semantic.qualification_alignment?.summary;
  if (eduSummary && typeof eduSummary === "string" && eduSummary.trim()) {
    points.push({ label: "Education", text: eduSummary.trim() });
  }

  const expSummary =
    (Array.isArray(semantic.experience_analysis) && semantic.experience_analysis[0]) ||
    semantic.experience_alignment?.summary;
  if (expSummary && typeof expSummary === "string" && expSummary.trim()) {
    points.push({ label: "Relevant background", text: expSummary.trim() });
  }

  if (semantic.responsibility_alignment?.summary && typeof semantic.responsibility_alignment.summary === "string") {
    points.push({ label: "Role alignment", text: semantic.responsibility_alignment.summary.trim() });
  }

  if (semantic.project_alignment?.summary && typeof semantic.project_alignment.summary === "string") {
    points.push({ label: "Projects & technical exposure", text: semantic.project_alignment.summary.trim() });
  }

  if (
    semantic.additional_requirements_alignment?.summary &&
    typeof semantic.additional_requirements_alignment.summary === "string"
  ) {
    points.push({
      label: "Additional requirements",
      text: semantic.additional_requirements_alignment.summary.trim(),
    });
  }

  if (Array.isArray(semantic.alignment_points) && semantic.alignment_points.length > 0) {
    for (const pt of semantic.alignment_points) {
      if (typeof pt === "string" && pt.trim()) {
        const text = pt.trim();
        if (!points.some((p) => p.text === text)) {
          points.push({ label: "Cloud exposure & strengths", text });
        }
      }
    }
  }

  const gapsList = semantic.technical_gaps || semantic.gaps;
  if (Array.isArray(gapsList) && gapsList.length > 0) {
    for (const gap of gapsList) {
      if (typeof gap === "string" && gap.trim()) {
        points.push({ label: "Gaps", text: gap.trim() });
      }
    }
  }

  if (points.length > 0) {
    return points;
  }

  if (Array.isArray(semantic.criteria_evaluations) && semantic.criteria_evaluations.length > 0) {
    for (const ce of semantic.criteria_evaluations) {
      const txt = ce.summary || ce.explanation;
      if (typeof txt === "string" && txt.trim()) {
        points.push({ label: ce.criterion || ce.name, text: txt.trim() });
      }
    }
    if (points.length > 0) return points;
  }

  if (typeof semantic.summary === "string" && semantic.summary.trim()) {
    const lines = semantic.summary.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      return lines.map((line: string) => {
        const clean = line.replace(/^[•\-\*]\s*/, "");
        const colonIdx = clean.indexOf(":");
        if (colonIdx > 0 && colonIdx < 35) {
          return {
            label: clean.slice(0, colonIdx).trim(),
            text: clean.slice(colonIdx + 1).trim(),
          };
        }
        return { text: clean };
      });
    }
    return [{ text: semantic.summary.trim() }];
  }

  return [];
}

export function extractSemanticReview(semantic: Record<string, any> | null | undefined): string | null {
  if (!semantic) return null;

  if (typeof semantic.summary === "string" && semantic.summary.trim()) {
    return semantic.summary.trim();
  }

  if (Array.isArray(semantic.criteria_evaluations) && semantic.criteria_evaluations.length > 0) {
    const pieces = semantic.criteria_evaluations
      .map((c: any) => c.summary || c.explanation)
      .filter((s: any) => typeof s === "string" && s.trim());
    if (pieces.length > 0) {
      return pieces.join(" ");
    }
  }

  const standardKeys = [
    "responsibility_alignment",
    "experience_alignment",
    "qualification_alignment",
    "project_alignment",
    "additional_requirements_alignment",
  ];

  const summaries: string[] = [];
  for (const key of standardKeys) {
    const item = semantic[key];
    if (item && typeof item === "object" && typeof item.summary === "string" && item.summary.trim()) {
      summaries.push(item.summary.trim());
    }
  }

  if (summaries.length > 0) {
    return summaries.join(" ");
  }

  return null;
}
