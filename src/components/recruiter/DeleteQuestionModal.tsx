import { X, Trash2, Loader2 } from "lucide-react"
import type { MCQQuestion } from "../../utils/api"

interface DeleteQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: MCQQuestion | null;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteQuestionModal({
  isOpen,
  onClose,
  question,
  onConfirm,
  isDeleting,
}: DeleteQuestionModalProps) {
  if (!isOpen || !question) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/55 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white border border-[#E6E0D6] rounded-2xl shadow-xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E0D6]">
          <h3 className="font-serif text-lg font-bold text-charcoal tracking-tight">
            Delete Question?
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg p-1 text-[#78716C] hover:text-charcoal hover:bg-cream transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed">
            Are you sure you want to delete this MCQ question from the assessment? This action cannot be undone.
          </p>

          <div className="p-3 rounded-xl bg-cream/60 border border-[#E6E0D6] text-xs text-charcoal space-y-1">
            <span className="font-semibold block truncate">
              {question.question_text}
            </span>
            <div className="flex items-center gap-2 text-[11px] text-[#78716C]">
              <span>Correct Answer: Option {question.correct_option}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F0ECE4]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg border border-[#E6E0D6] bg-white px-3.5 py-2 text-xs font-semibold text-charcoal hover:bg-cream transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                <span>Delete Question</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
