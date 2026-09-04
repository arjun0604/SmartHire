import { Plus, CheckCircle2 } from "lucide-react"

interface RecruiterAssessmentsProps {
  onCreateAssessment: () => void;
}

export function RecruiterAssessments({ onCreateAssessment }: RecruiterAssessmentsProps) {
  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full overflow-hidden">
      <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E0D6] pb-3.5 sm:pb-4">
          <div>
            <h2 className="font-serif text-base sm:text-lg font-bold text-charcoal">Technical Assessment Builder</h2>
            <p className="text-xs text-[#78716C] mt-1">Configure automated MCQ screening criteria for candidate match gating.</p>
          </div>
          <button
            type="button"
            onClick={onCreateAssessment}
            className="rounded-md bg-terracotta px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-terracotta-dark transition-colors cursor-pointer flex items-center gap-1 self-start sm:self-auto shrink-0"
          >
            <Plus className="size-3.5" />
            <span>Create Template</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4 mt-4 sm:mt-5">
          <div className="border border-[#E6E0D6] rounded-lg p-3.5 sm:p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-terracotta uppercase">15 MCQ Questions &bull; 20 Mins</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Active Gate
                </span>
              </div>
              <h4 className="font-semibold text-sm text-charcoal mt-2">Frontend Engineering Assessment</h4>
              <p className="text-xs text-[#78716C] mt-1">Linked to: Senior React Engineer (Passing Threshold: 80%)</p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="size-4" />
              <span>8 Candidates Evaluated</span>
            </div>
          </div>

          <div className="border border-[#E6E0D6] rounded-lg p-3.5 sm:p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-terracotta uppercase">12 MCQ Questions &bull; 15 Mins</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Active Gate
                </span>
              </div>
              <h4 className="font-semibold text-sm text-charcoal mt-2">Backend Architecture Assessment</h4>
              <p className="text-xs text-[#78716C] mt-1">Linked to: Lead Backend Architect (Passing Threshold: 75%)</p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="size-4" />
              <span>5 Candidates Evaluated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
