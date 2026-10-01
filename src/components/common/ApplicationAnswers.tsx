import type { Application } from "../../store/slices/applicationsSlice"

export interface ApplicationAnswersProps {
  application: Application;
}

export function ApplicationAnswers({ application }: ApplicationAnswersProps) {
  const isEmployed = Boolean(application.is_currently_employed);

  return (
    <section className="rounded-2xl border border-[#E6E0D6] bg-white p-6 sm:p-7 space-y-4 shadow-2xs">
      <div className="border-b border-[#F0ECE4] pb-2.5">
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
          Submitted Application Answers
        </h3>
      </div>

      <div className="space-y-4 pt-1">
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-charcoal block">
            Are you currently employed?
          </span>
          <div className="text-xs text-[#44403C] leading-relaxed p-3.5 rounded-xl bg-cream border border-[#E6E0D6]">
            {isEmployed ? "Yes" : "No"}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-charcoal block">
            Why interested in this position?
          </span>
          <div className="text-xs text-[#44403C] leading-relaxed p-3.5 rounded-xl bg-cream border border-[#E6E0D6]">
            {application.why_interested || "No answer provided."}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-charcoal block">
            Relevant Experience:
          </span>
          <div className="text-xs text-[#44403C] leading-relaxed p-3.5 rounded-xl bg-cream border border-[#E6E0D6]">
            {application.relevant_experience || "No answer provided."}
          </div>
        </div>

        {application.additional_information && application.additional_information.trim() && (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-charcoal block">
              Additional Information:
            </span>
            <div className="text-xs text-[#44403C] leading-relaxed p-3.5 rounded-xl bg-cream border border-[#E6E0D6]">
              {application.additional_information}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
