import { UserX, UserCheck, ArrowUpRight } from "lucide-react"

interface RecruiterCandidatesProps {
  onRejectCandidate: (id: string) => void;
  onShortlistCandidate: (id: string) => void;
  onScheduleInterview: (id: string) => void;
}

export function RecruiterCandidates({
  onRejectCandidate,
  onShortlistCandidate,
  onScheduleInterview,
}: RecruiterCandidatesProps) {
  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div>
          <h2 className="font-serif text-base sm:text-lg font-bold text-charcoal">AI-Ranked Candidates</h2>
          <p className="text-xs text-[#78716C]">Candidates automatically scored against your job requirement criteria.</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] border border-[#E6E0D6] text-charcoal self-start sm:self-auto shrink-0">
          38 Vetted Candidates
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
        <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-terracotta/40 transition-colors">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif text-base font-bold text-charcoal">Alex Morgan</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    94% AI Match
                  </span>
                </div>
                <p className="text-xs text-[#78716C] mt-0.5">Applied for: Senior React Engineer</p>
              </div>
              <span className="text-xs font-mono text-emerald-700 font-semibold shrink-0">
                MCQ: 94/100
              </span>
            </div>

            <div className="bg-[#FAF8F5] p-3 rounded-lg border border-[#E6E0D6] mt-3.5 text-xs text-[#78716C] space-y-1">
              <p><span className="font-semibold text-charcoal">Resume:</span> Alex_Morgan_Staff_Frontend.pdf</p>
              <p><span className="font-semibold text-charcoal">Key Skills:</span> React 19, TypeScript, Webpack, State Architecture</p>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-[#E6E0D6] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onRejectCandidate("cand_1")}
              className="text-xs text-red-600 hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto"
            >
              <UserX className="size-3.5" />
              <span>Decline</span>
            </button>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => onShortlistCandidate("cand_1")}
                className="rounded-md border border-[#E6E0D6] px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-[#FAF8F5] cursor-pointer flex items-center gap-1"
              >
                <UserCheck className="size-3.5 text-emerald-600" />
                <span>Shortlist</span>
              </button>
              <button
                type="button"
                onClick={() => onScheduleInterview("cand_1")}
                className="rounded-md bg-terracotta px-3.5 py-1.5 text-xs font-medium text-white hover:bg-terracotta-dark cursor-pointer flex items-center gap-1"
              >
                <span>Schedule Interview</span>
                <ArrowUpRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#E6E0D6] bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between hover:border-terracotta/40 transition-colors">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif text-base font-bold text-charcoal">Elena Rostova</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    88% AI Match
                  </span>
                </div>
                <p className="text-xs text-[#78716C] mt-0.5">Applied for: Lead Backend Architect</p>
              </div>
              <span className="text-xs font-mono text-emerald-700 font-semibold shrink-0">
                MCQ: 91/100
              </span>
            </div>

            <div className="bg-[#FAF8F5] p-3 rounded-lg border border-[#E6E0D6] mt-3.5 text-xs text-[#78716C] space-y-1">
              <p><span className="font-semibold text-charcoal">Resume:</span> Elena_Rostova_Distributed_Systems.pdf</p>
              <p><span className="font-semibold text-charcoal">Key Skills:</span> Go, Kubernetes, Kafka, Microservices Architecture</p>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-[#E6E0D6] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onRejectCandidate("cand_2")}
              className="text-xs text-red-600 hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto"
            >
              <UserX className="size-3.5" />
              <span>Decline</span>
            </button>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => onShortlistCandidate("cand_2")}
                className="rounded-md border border-[#E6E0D6] px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-[#FAF8F5] cursor-pointer flex items-center gap-1"
              >
                <UserCheck className="size-3.5 text-emerald-600" />
                <span>Shortlist</span>
              </button>
              <button
                type="button"
                onClick={() => onScheduleInterview("cand_2")}
                className="rounded-md bg-terracotta px-3.5 py-1.5 text-xs font-medium text-white hover:bg-terracotta-dark cursor-pointer flex items-center gap-1"
              >
                <span>Schedule Interview</span>
                <ArrowUpRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
