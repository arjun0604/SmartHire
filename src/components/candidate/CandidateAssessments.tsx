import { ArrowUpRight, CheckCircle2 } from "lucide-react"

interface CandidateAssessmentsProps {
  onStartAssessment: (id: string) => void;
}

export function CandidateAssessments({ onStartAssessment }: CandidateAssessmentsProps) {
  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full overflow-hidden">
      <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs">
        <h2 className="font-serif text-base sm:text-lg font-bold text-charcoal">Technical MCQ Assessments</h2>
        <p className="text-xs text-[#78716C] mt-1">
          Assessments are automatically generated and unlocked for roles with a 50%+ resume match.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4 mt-4 sm:mt-5">
          <div className="border border-[#E6E0D6] rounded-lg p-3.5 sm:p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-terracotta uppercase">15 Questions &bull; 20 Mins</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  Pending
                </span>
              </div>
              <h4 className="font-semibold text-sm text-charcoal mt-2">Acme Corp Technical Screening</h4>
              <p className="text-xs text-[#78716C] mt-1">Focus: TypeScript Generics, React Hook Lifecycle, REST APIs</p>
            </div>
            <button
              type="button"
              onClick={() => onStartAssessment("asmt_2")}
              className="mt-4 w-full rounded-md bg-terracotta py-2 text-xs font-medium text-white hover:bg-terracotta-dark cursor-pointer flex items-center justify-center gap-1"
            >
              <span>Start Assessment</span>
              <ArrowUpRight className="size-3.5" />
            </button>
          </div>

          <div className="border border-[#E6E0D6] rounded-lg p-3.5 sm:p-4 flex flex-col justify-between bg-stone-50/50">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#78716C] uppercase">10 Questions &bull; 15 Mins</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Completed
                </span>
              </div>
              <h4 className="font-semibold text-sm text-charcoal mt-2">Meridian Labs Frontend Benchmark</h4>
              <p className="text-xs text-[#78716C] mt-1">Score: 94 / 100 &bull; Passed on Aug 26, 2026</p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="size-4" />
              <span>Verified & Shared with Recruiter</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
