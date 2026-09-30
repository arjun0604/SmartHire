import { useState, useEffect } from "react"
import { X, AlertCircle, Loader2 } from "lucide-react"
import {
  createJobQuestionApi,
  updateQuestionApi,
  type MCQQuestion,
} from "../../utils/api"

interface MCQQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  initialData?: MCQQuestion | null;
  onSuccess: (question: MCQQuestion) => void;
}

export function MCQQuestionModal({
  isOpen,
  onClose,
  jobId,
  initialData,
  onSuccess,
}: MCQQuestionModalProps) {
  const isEditing = Boolean(initialData);

  const [questionText, setQuestionText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOption, setCorrectOption] = useState<"A" | "B" | "C" | "D">("A");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setQuestionText(initialData.question_text || "");
        setOptionA(initialData.option_a || "");
        setOptionB(initialData.option_b || "");
        setOptionC(initialData.option_c || "");
        setOptionD(initialData.option_d || "");
        setCorrectOption(initialData.correct_option || "A");
      } else {
        setQuestionText("");
        setOptionA("");
        setOptionB("");
        setOptionC("");
        setOptionD("");
        setCorrectOption("A");
      }
      setErrors({});
      setServerError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!questionText.trim()) {
      errs.questionText = "Question text is required.";
    }

    if (!optionA.trim()) {
      errs.optionA = "Option A is required.";
    }

    if (!optionB.trim()) {
      errs.optionB = "Option B is required.";
    }

    if (!optionC.trim()) {
      errs.optionC = "Option C is required.";
    }

    if (!optionD.trim()) {
      errs.optionD = "Option D is required.";
    }

    if (!["A", "B", "C", "D"].includes(correctOption)) {
      errs.correctOption = "Please select a valid correct option (A, B, C, or D).";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (isEditing && initialData?.id) {
        const updated = await updateQuestionApi(initialData.id, {
          question_text: questionText.trim(),
          option_a: optionA.trim(),
          option_b: optionB.trim(),
          option_c: optionC.trim(),
          option_d: optionD.trim(),
          correct_option: correctOption,
          marks: 1,
        });
        onSuccess(updated);
      } else {
        const created = await createJobQuestionApi(jobId, {
          job_id: jobId,
          question_text: questionText.trim(),
          option_a: optionA.trim(),
          option_b: optionB.trim(),
          option_c: optionC.trim(),
          option_d: optionD.trim(),
          correct_option: correctOption,
          marks: 1,
        });
        onSuccess(created);
      }
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        (Array.isArray(err?.response?.data?.detail)
          ? err.response.data.detail.map((d: any) => d.msg).join(", ")
          : null) ||
        "Failed to save question. Please verify all fields.";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/55 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white border border-[#E6E0D6] rounded-2xl shadow-xl flex flex-col my-auto max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 py-4 border-b border-[#E6E0D6] flex items-center justify-between bg-cream/50">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
              {isEditing ? "Edit Question" : "Add Question"}
            </h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              Configure question text, answer choices, and the correct option.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-black/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-5 sm:p-6 space-y-5">
            {serverError && (
              <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{serverError}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-charcoal uppercase tracking-wider">
                  Question Text <span className="text-terracotta">*</span>
                </label>
                <span className="text-[11px] text-[#78716C]">Clear and concise prompt</span>
              </div>
              <textarea
                rows={3}
                value={questionText}
                onChange={(e) => {
                  setQuestionText(e.target.value);
                  if (errors.questionText) {
                    setErrors((prev) => ({ ...prev, questionText: "" }));
                  }
                }}
                placeholder="e.g. What is the primary purpose of a reverse proxy in microservices?"
                className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder-[#8E877D] focus:outline-hidden focus:ring-1 transition-colors resize-none ${
                  errors.questionText
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-[#E6E0D6] focus:border-terracotta focus:ring-terracotta"
                }`}
              />
              {errors.questionText && (
                <p className="text-[11px] text-red-600 mt-1">{errors.questionText}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-charcoal uppercase tracking-wider">
                  Answer Options <span className="text-terracotta">*</span>
                </label>
                <span className="text-[11px] text-[#78716C]">
                  Select the radio indicator to set the correct answer
                </span>
              </div>

              {[
                { label: "A" as const, val: optionA, setVal: setOptionA, errKey: "optionA" },
                { label: "B" as const, val: optionB, setVal: setOptionB, errKey: "optionB" },
                { label: "C" as const, val: optionC, setVal: setOptionC, errKey: "optionC" },
                { label: "D" as const, val: optionD, setVal: setOptionD, errKey: "optionD" },
              ].map(({ label, val, setVal, errKey }) => {
                const isSelected = correctOption === label;
                const hasErr = Boolean(errors[errKey]);

                return (
                  <div key={label}>
                    <div
                      className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-500/30"
                          : hasErr
                          ? "border-red-300 bg-white"
                          : "border-[#E6E0D6] bg-white hover:border-[#D6CEC2]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCorrectOption(label);
                          if (errors.correctOption) {
                            setErrors((prev) => ({ ...prev, correctOption: "" }));
                          }
                        }}
                        className={`size-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "bg-[#F5F2EB] text-charcoal hover:bg-[#EBE6DD]"
                        }`}
                        title={`Mark Option ${label} as correct`}
                      >
                        {label}
                      </button>

                      <input
                        type="text"
                        value={val}
                        onChange={(e) => {
                          setVal(e.target.value);
                          if (errors[errKey]) {
                            setErrors((prev) => ({ ...prev, [errKey]: "" }));
                          }
                        }}
                        placeholder={`Option ${label} answer text...`}
                        className="w-full bg-transparent border-0 px-2 py-1 text-sm text-charcoal placeholder-[#8E877D] focus:outline-hidden"
                      />

                      <button
                        type="button"
                        onClick={() => setCorrectOption(label)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold shrink-0 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "text-[#78716C] hover:text-charcoal hover:bg-[#F5F2EB]"
                        }`}
                      >
                        {isSelected ? "Correct Answer" : "Mark Correct"}
                      </button>
                    </div>

                    {errors[errKey] && (
                      <p className="text-[11px] text-red-600 mt-1 pl-2">{errors[errKey]}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-1">
              <label className="text-xs font-semibold text-charcoal uppercase tracking-wider block mb-1.5">
                Correct Answer <span className="text-terracotta">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["A", "B", "C", "D"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCorrectOption(opt)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      correctOption === opt
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                        : "bg-white text-charcoal border-[#E6E0D6] hover:bg-cream"
                    }`}
                  >
                    Option {opt}
                  </button>
                ))}
              </div>
              {errors.correctOption && (
                <p className="text-[11px] text-red-600 mt-1">{errors.correctOption}</p>
              )}
            </div>
          </div>

          <div className="px-5 sm:px-6 py-4 border-t border-[#E6E0D6] bg-cream/40 flex items-center justify-end gap-3 mt-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-[#E6E0D6] bg-white text-xs font-semibold text-charcoal hover:bg-cream transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              <span>{isEditing ? "Save Changes" : "Create Question"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
