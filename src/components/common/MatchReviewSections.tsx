import React from "react";
import {
  getExperienceAssessment,
  getEducationAssessment,
  extractStructuredSemanticReview,
} from "../../utils/formatters";

export interface MatchExperienceReviewProps {
  experience?: Record<string, any> | null;
}

export const MatchExperienceReview: React.FC<MatchExperienceReviewProps> = ({ experience }) => {
  const { requiredText, candidateText, assessmentText, isMet } = getExperienceAssessment(experience);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-charcoal">
          Work Experience
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E877D] block">
            Required
          </span>
          <p className="mt-1 text-sm font-semibold text-charcoal">
            {requiredText}
          </p>
        </div>

        <div className="rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E877D] block">
            Candidate
          </span>
          <p className="mt-1 text-sm font-semibold text-charcoal">
            {candidateText}
          </p>
        </div>

        <div
          className={`rounded-xl border p-3.5 ${
            isMet
              ? "border-[#CCDBC9] bg-[#EAEFEA]/50 text-[#2D5A27]"
              : "border-[#F1D0C5] bg-[#FDF0EC]/60 text-terracotta"
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider block opacity-80">
            Assessment
          </span>
          <p className="mt-1 text-sm font-semibold">
            {assessmentText}
          </p>
        </div>
      </div>

      {experience?.explanation ? (
        <p className="text-xs text-[#57534E] leading-relaxed pt-1">
          {experience.explanation}
        </p>
      ) : (
        <p className="text-xs text-[#8E877D] italic pt-1">
          Experience details not evaluated.
        </p>
      )}
    </div>
  );
};

export interface MatchEducationReviewProps {
  education?: Record<string, any> | null;
}

export const MatchEducationReview: React.FC<MatchEducationReviewProps> = ({ education }) => {
  const { requiredText, candidateText, assessmentText, isMet } = getEducationAssessment(education);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-charcoal">
          Education
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E877D] block">
            Required
          </span>
          <p className="mt-1 text-sm font-semibold text-charcoal">
            {requiredText}
          </p>
        </div>

        <div className="rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E877D] block">
            Candidate
          </span>
          <p className="mt-1 text-sm font-semibold text-charcoal">
            {candidateText}
          </p>
        </div>

        <div
          className={`rounded-xl border p-3.5 ${
            isMet
              ? "border-[#CCDBC9] bg-[#EAEFEA]/50 text-[#2D5A27]"
              : "border-[#F1D0C5] bg-[#FDF0EC]/60 text-terracotta"
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider block opacity-80">
            Assessment
          </span>
          <p className="mt-1 text-sm font-semibold">
            {assessmentText}
          </p>
        </div>
      </div>

      {education?.explanation ? (
        <p className="text-xs text-[#57534E] leading-relaxed pt-1">
          {education.explanation}
        </p>
      ) : (
        <p className="text-xs text-[#8E877D] italic pt-1">
          Education details not evaluated.
        </p>
      )}
    </div>
  );
};

export interface MatchSemanticReviewProps {
  semantic?: Record<string, any> | null;
}

export const MatchSemanticReview: React.FC<MatchSemanticReviewProps> = ({ semantic }) => {
  const points = extractStructuredSemanticReview(semantic);

  return (
    <div className="rounded-2xl border border-[#E6E0D6] bg-[#FAF8F5] p-5">
      {points.length > 0 ? (
        <ul className="space-y-3 font-sans">
          {points.map((pt, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-xs sm:text-sm text-[#44403C] leading-relaxed"
            >
              <span className="text-terracotta font-bold text-base leading-none select-none mt-0.5">
                •
              </span>
              <div>
                {pt.label && (
                  <span className="font-semibold text-charcoal mr-1.5">
                    {pt.label}:
                  </span>
                )}
                <span>{pt.text}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[#8E877D] italic font-sans">
          Semantic alignment review is not available for this record yet.
        </p>
      )}
    </div>
  );
};
