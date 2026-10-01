import { Loader2, AlertCircle } from "lucide-react"
import { Skeleton } from "../ui/skeleton"
import type { MatchReport } from "../../utils/api"
import {
  formatDate,
  getMatchAlignmentBadge,
} from "../../utils/formatters"
import {
  MatchExperienceReview,
  MatchEducationReview,
  MatchSemanticReview,
} from "./MatchReviewSections"

export interface ApplicationMatchReviewProps {
  matchReport: MatchReport | null;
  isLoading: boolean;
  errorMessage?: string | null;
  jobTitle?: string;
  onRetry?: () => void;
  subtitle?: string;
}

export function ApplicationMatchReview({
  matchReport,
  isLoading,
  errorMessage,
  jobTitle,
  onRetry,
  subtitle,
}: ApplicationMatchReviewProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[#E6E0D6] bg-white p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 text-terracotta animate-spin" />
          <span className="text-xs font-semibold text-charcoal">
            Loading Application Match evaluation...
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/70 p-6 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-charcoal">Match Review Error</h4>
            <p className="text-xs text-[#78716C]">{errorMessage}</p>
          </div>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-terracotta-dark transition-colors cursor-pointer shrink-0"
          >
            Retry Match
          </button>
        )}
      </div>
    );
  }

  if (!matchReport) {
    return (
      <div className="rounded-2xl border border-[#E6E0D6] bg-white p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-charcoal">
          No Application Match Available
        </p>
        <p className="text-xs text-[#78716C] max-w-md mx-auto">
          This application does not have a completed match evaluation record yet.
        </p>
        {onRetry && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-terracotta-dark transition-colors cursor-pointer"
            >
              Check Again
            </button>
          </div>
        )}
      </div>
    );
  }

  const atsScore = Math.round(matchReport.ats_score ?? 0);
  const overallScore =
    matchReport.overall_score !== null && matchReport.overall_score !== undefined
      ? Math.round(matchReport.overall_score)
      : atsScore;

  const semanticScoreRaw =
    matchReport.ai_score ??
    (matchReport.semantic && typeof matchReport.semantic.semantic_score === "number"
      ? matchReport.semantic.semantic_score
      : null);
  const semanticScore = semanticScoreRaw !== null ? Math.round(semanticScoreRaw) : null;

  const alignmentBadge = getMatchAlignmentBadge(overallScore);
  const b = matchReport.breakdown || {};
  const evaluationDate = formatDate(matchReport.created_at || matchReport.updated_at);

  const combinedStrengths: string[] = Array.from(
    new Set([
      ...(Array.isArray(matchReport.strengths) ? matchReport.strengths : []),
      ...(Array.isArray(matchReport.semantic?.strengths) ? matchReport.semantic.strengths : []),
    ])
  ).filter(Boolean);

  const combinedGaps: string[] = Array.from(
    new Set([
      ...(Array.isArray(matchReport.gaps) ? matchReport.gaps : []),
      ...(Array.isArray(matchReport.semantic?.gaps) ? matchReport.semantic.gaps : []),
    ])
  ).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="bg-cream border border-[#E6E0D6] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-md border bg-[#FAF2EE] text-terracotta border-[#E8D4CB]">
              Official Application Match
            </span>
            {evaluationDate && (
              <span className="text-xs text-[#78716C]">
                Evaluated {evaluationDate}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1.5">
            {subtitle || `Strictly evaluated from candidate snapshot and submitted resume for ${jobTitle || "this job opening"}.`}
          </p>
        </div>
      </div>

      <section aria-label="Score Summary" className="rounded-2xl bg-cream border border-[#E6E0D6] p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white border border-[#E6E0D6] p-4 flex flex-col justify-between shadow-3xs">
            <div>
              <span className="text-xs font-medium text-[#8E877D] uppercase tracking-wider block">
                Overall Match
              </span>
              <div className="mt-2">
                <span className="font-sans text-4xl sm:text-4xl lg:text-[42px] font-normal tracking-tight text-terracotta leading-none">
                  {overallScore}%
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#F0ECE4] flex items-center justify-between">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${alignmentBadge.style}`}
              >
                {alignmentBadge.label}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-[#E6E0D6] p-4 flex flex-col justify-between shadow-3xs">
            <div>
              <span className="text-xs font-medium text-[#8E877D] uppercase tracking-wider block">
                ATS Match
              </span>
              <div className="mt-2">
                <span className="font-sans text-4xl sm:text-4xl lg:text-[42px] font-normal tracking-tight text-charcoal leading-none">
                  {atsScore}%
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#F0ECE4]">
              <span className="text-[11px] text-[#78716C] block">
                Requirements alignment
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-[#E6E0D6] p-4 flex flex-col justify-between shadow-3xs">
            <div>
              <span className="text-xs font-medium text-[#8E877D] uppercase tracking-wider block">
                Semantic Match
              </span>
              <div className="mt-2">
                <span className="font-sans text-4xl sm:text-4xl lg:text-[42px] font-normal tracking-tight text-charcoal leading-none">
                  {semanticScore !== null ? `${semanticScore}%` : "—"}
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#F0ECE4]">
              <span className="text-[11px] text-[#78716C] block">
                {semanticScore !== null ? "Contextual & depth fit" : "Review in progress"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Strengths and Gaps" className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-charcoal">
          Key Strengths & Growth Areas
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[#E6E0D6] bg-cream p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-charcoal">
                Key Strengths
              </span>
              {combinedStrengths.length > 0 && (
                <span className="text-[11px] text-[#2D5A27] font-medium">
                  {combinedStrengths.length} identified
                </span>
              )}
            </div>

            {combinedStrengths.length > 0 ? (
              <ul className="space-y-2 text-xs text-[#44403C] leading-relaxed">
                {combinedStrengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-terracotta select-none leading-tight font-bold">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#8E877D] italic">
                No specific strengths noted.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[#E6E0D6] bg-cream p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
                Areas to Strengthen
              </span>
              {combinedGaps.length > 0 && (
                <span className="text-[11px] text-terracotta font-medium">
                  {combinedGaps.length} noted
                </span>
              )}
            </div>

            {combinedGaps.length > 0 ? (
              <ul className="space-y-2 text-xs text-[#44403C] leading-relaxed">
                {combinedGaps.map((gap, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#8E877D] select-none leading-tight font-bold">•</span>
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#8E877D] italic">
                No critical qualification gaps identified.
              </p>
            )}
          </div>
        </div>
      </section>

      <section aria-label="Skills Overview" className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-charcoal">
          Skills Overview
        </h2>

        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 space-y-5">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-charcoal">
                Required Skills
              </span>
              {b.required_skills?.total !== undefined && (
                <span className="text-xs text-[#78716C]">
                  {b.required_skills.matched_count ?? b.required_skills.matched?.length ?? 0} of {b.required_skills.total} matched
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              {b.required_skills?.matched && b.required_skills.matched.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-[#2D5A27] mr-1">Matched:</span>
                  {b.required_skills.matched.map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-[#F2F7F2] text-[#2D5A27] border border-[#CCDBC9] font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {b.required_skills?.missing && b.required_skills.missing.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-terracotta mr-1">Missing:</span>
                  {b.required_skills.missing.map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-cream text-[#78716C] border border-[#E6E0D6] font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#F0ECE4] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-charcoal">
                Preferred Skills
              </span>
              {b.preferred_skills?.total !== undefined && (
                <span className="text-xs text-[#78716C]">
                  {b.preferred_skills.matched_count ?? b.preferred_skills.matched?.length ?? 0} of {b.preferred_skills.total} matched
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              {b.preferred_skills?.matched && b.preferred_skills.matched.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-[#2D5A27] mr-1">Matched:</span>
                  {b.preferred_skills.matched.map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-[#F2F7F2] text-[#2D5A27] border border-[#CCDBC9] font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {b.preferred_skills?.missing && b.preferred_skills.missing.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-[#78716C] mr-1">Missing:</span>
                  {b.preferred_skills.missing.map((skill: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-cream text-[#8E877D] border border-[#E6E0D6] font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Experience and Education" className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-charcoal">
          Experience &amp; Education Alignment
        </h2>

        <div className="rounded-2xl border border-[#E6E0D6] bg-white p-5 space-y-6">
          <MatchExperienceReview experience={b.experience} />
          <div className="border-t border-[#F0ECE4] pt-5">
            <MatchEducationReview education={b.education} />
          </div>
        </div>
      </section>

      <section aria-label="Semantic Review" className="space-y-3">
        <h2 className="font-serif text-lg font-bold text-charcoal">
          Semantic Review
        </h2>

        <MatchSemanticReview semantic={matchReport.semantic} />
      </section>
    </div>
  );
}
