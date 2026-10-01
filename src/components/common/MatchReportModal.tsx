import React, { useEffect } from "react";
import type { MatchReport } from "../../utils/api";
import { formatDate } from "../../utils/formatters";
import {
  MatchExperienceReview,
  MatchEducationReview,
  MatchSemanticReview,
} from "./MatchReviewSections";

interface MatchReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: MatchReport | null;
  jobTitle?: string;
  candidateName?: string;
}

export const MatchReportModal: React.FC<MatchReportModalProps> = ({
  isOpen,
  onClose,
  report,
  jobTitle,
  candidateName,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !report) return null;

  const atsScore = Math.round(report.ats_score ?? 0);
  const overallScore =
    report.overall_score !== null && report.overall_score !== undefined
      ? Math.round(report.overall_score)
      : atsScore;

  const semanticScoreRaw =
    report.ai_score ??
    (report.semantic && typeof report.semantic.semantic_score === "number"
      ? report.semantic.semantic_score
      : null);
  const semanticScore = semanticScoreRaw !== null ? Math.round(semanticScoreRaw) : null;

  const alignmentBadge =
    overallScore >= 80
      ? { label: "Strong Match", style: "text-[#2D5A27] bg-[#EAEFEA] border-[#CCDBC9]" }
      : overallScore >= 60
        ? { label: "Moderate Match", style: "text-[#7A5813] bg-[#F7F2EB] border-[#EADBBD]" }
        : { label: "Needs Review", style: "text-terracotta bg-[#FDF0EC] border-[#F1D0C5]" };

  const isApplicationMatch = report.match_type === "application";
  const b = report.breakdown || {};
  const evaluationDate = formatDate(report.created_at || report.updated_at);

  const combinedStrengths: string[] = Array.from(
    new Set([
      ...(Array.isArray(report.strengths) ? report.strengths : []),
      ...(Array.isArray(report.semantic?.strengths) ? report.semantic.strengths : []),
    ])
  ).filter(Boolean);

  const combinedGaps: string[] = Array.from(
    new Set([
      ...(Array.isArray(report.gaps) ? report.gaps : []),
      ...(Array.isArray(report.semantic?.gaps) ? report.semantic.gaps : []),
    ])
  ).filter(Boolean);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-review-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-charcoal/50 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-xl shadow-lg border border-[#E6E0D6] overflow-hidden">
        <header className="bg-cream border-b border-[#E6E0D6] px-6 py-5 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-md border ${isApplicationMatch
                    ? "bg-[#FAF2EE] text-terracotta border-[#E8D4CB]"
                    : "bg-cream-muted text-charcoal border-[#E6E0D6]"
                  }`}
              >
                {isApplicationMatch ? "Official Application Match" : "Resume Pre-Match"}
              </span>

              {evaluationDate && (
                <span className="text-xs text-[#78716C]">
                  Evaluated {evaluationDate}
                </span>
              )}
            </div>

            <h1
              id="match-review-title"
              className="font-serif text-2xl sm:text-[26px] font-bold text-charcoal tracking-tight truncate"
            >
              Match Review
            </h1>

            <p className="text-xs sm:text-sm text-[#78716C] font-sans">
              {jobTitle && <span className="font-medium text-charcoal">{jobTitle}</span>}
              {jobTitle && candidateName && <span> • </span>}
              {candidateName && <span>Candidate: {candidateName}</span>}
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-white text-charcoal">
          <section aria-label="Score Summary" className="rounded-xl bg-cream border border-[#E6E0D6] p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-white border border-[#E6E0D6] p-4 flex flex-col justify-between shadow-3xs">
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

              <div className="rounded-lg bg-white border border-[#E6E0D6] p-4 flex flex-col justify-between shadow-3xs">
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

              <div className="rounded-lg bg-white border border-[#E6E0D6] p-4 flex flex-col justify-between shadow-3xs">
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

          <section aria-label="Strengths and Areas to Strengthen" className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-charcoal">
              Strengths &amp; Growth Areas
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-[#E6E0D6] bg-cream p-4 space-y-2.5">
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

              <div className="rounded-lg border border-[#E6E0D6] bg-cream p-4 space-y-2.5">
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

            <div className="rounded-xl border border-[#E6E0D6] bg-white p-5 space-y-5">
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
                      <span className="text-[11px] font-medium text-[#2D5A27] mr-1">
                        Matched:
                      </span>
                      {b.required_skills.matched.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-cream text-charcoal border border-[#E6E0D6] text-xs font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {b.required_skills?.missing && b.required_skills.missing.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-medium text-terracotta mr-1">
                        Missing:
                      </span>
                      {b.required_skills.missing.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-[#FAF2EE] text-terracotta border border-[#E8D4CB] text-xs font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {(!b.required_skills?.total || b.required_skills.total === 0) && (
                    <p className="text-xs text-[#8E877D] italic">
                      No required skills specified for this role.
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-[#F0ECE4] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
                    Preferred Skills
                  </span>
                  {b.preferred_skills?.total ? (
                    <span className="text-xs text-[#78716C]">
                      {b.preferred_skills.matched_count ?? b.preferred_skills.matched?.length ?? 0} of {b.preferred_skills.total} matched
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2 text-xs">
                  {b.preferred_skills?.matched && b.preferred_skills.matched.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-medium text-[#2D5A27] mr-1">
                        Matched:
                      </span>
                      {b.preferred_skills.matched.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-cream text-charcoal border border-[#E6E0D6] text-xs font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {b.preferred_skills?.missing && b.preferred_skills.missing.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-medium text-[#78716C] mr-1">
                        Missing:
                      </span>
                      {b.preferred_skills.missing.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-cream-muted text-[#57534E] border border-[#E6E0D6] text-xs font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {(!b.preferred_skills?.total || b.preferred_skills.total === 0) && (
                    <p className="text-xs text-[#8E877D] italic">
                      No preferred skills specified for this role.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section aria-label="Experience and Education" className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-charcoal">
              Experience &amp; Education
            </h2>

            <div className="rounded-xl border border-[#E6E0D6] bg-white p-5 space-y-6">
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

            <MatchSemanticReview semantic={report.semantic} />
          </section>
        </div>

        <footer className="px-6 py-4 border-t border-[#E6E0D6] bg-cream flex items-center justify-between">
          <span className="text-xs text-[#78716C]">
            SmartHire Match Review
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-md border border-[#E6E0D6] bg-white text-charcoal hover:bg-cream transition-colors cursor-pointer shadow-3xs"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};
