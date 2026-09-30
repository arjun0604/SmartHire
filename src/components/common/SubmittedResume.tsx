import { FileText, ExternalLink } from "lucide-react"

export interface SubmittedResumeProps {
  resumeName?: string | null;
  resumeDownloadUrl?: string | null;
  onViewResume?: () => void;
}

export function SubmittedResume({
  resumeName,
  resumeDownloadUrl,
  onViewResume,
}: SubmittedResumeProps) {
  const handleOpen = () => {
    if (onViewResume) {
      onViewResume();
    } else if (resumeDownloadUrl) {
      window.open(resumeDownloadUrl, "_blank", "noopener,noreferrer");
    }
  };

  const hasAction = Boolean(onViewResume || resumeDownloadUrl);

  return (
    <section className="rounded-2xl border border-[#E6E0D6] bg-white p-6 sm:p-7 space-y-3.5 shadow-2xs">
      <div className="border-b border-[#F0ECE4] pb-2.5">
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta">
          Submitted Resume
        </h3>
      </div>

      <div className="rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="size-10 rounded-lg bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-charcoal truncate font-mono">
              {resumeName || "Candidate_Resume.pdf"}
            </p>
            <p className="text-[11px] text-[#8E877D] mt-0.5">
              Pinned Application Resume Document
            </p>
          </div>
        </div>

        {hasAction && (
          <button
            type="button"
            onClick={handleOpen}
            className="text-xs font-semibold text-terracotta border border-[#E6E0D6] bg-white hover:bg-[#FAF8F5] px-3.5 py-2 rounded-lg shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
          >
            <span>View Resume</span>
            <ExternalLink className="size-3" />
          </button>
        )}
      </div>
    </section>
  );
}
