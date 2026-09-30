import { useState, useRef } from "react"
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import * as XLSX from "xlsx"
import { createJobQuestionsBulkApi, type MCQQuestion, type MCQQuestionCreatePayload } from "../../utils/api"

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  onSuccess: (importedCount: number, questions: MCQQuestion[]) => void;
}

interface ParsedRowResult {
  rowNumber: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  isValid: boolean;
  errors: string[];
}

export function ExcelUploadModal({
  isOpen,
  onClose,
  jobId,
  onSuccess,
}: ExcelUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRowResult[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  function handleReset() {
    setFile(null);
    setParsedRows([]);
    setUploadError(null);
    setIsParsing(false);
    setIsImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleClose() {
    handleReset();
    onClose();
  }

  function handleDownloadTemplate() {
    const templateRows = [
      {
        question_text: "Which language is used for React?",
        option_a: "Python",
        option_b: "JavaScript",
        option_c: "C++",
        option_d: "Go",
        correct_option: "B",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
    XLSX.writeFile(workbook, "smarthire_mcq_template.xlsx");
  }

  function normalizeHeader(val: any): string {
    return String(val || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function processFile(selectedFile: File) {
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      setUploadError("Please upload an Excel file (.xlsx or .xls).");
      return;
    }

    setUploadError(null);
    setFile(selectedFile);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setUploadError("The uploaded Excel workbook contains no sheets.");
          setIsParsing(false);
          return;
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, {
          header: 1,
          blankrows: true,
          defval: "",
        });

        if (!rawRows || rawRows.length === 0) {
          setUploadError("No question rows found in the uploaded file. Please use the template.");
          setIsParsing(false);
          return;
        }

        let headerRowIndex = -1;
        let colMap = {
          question_text: -1,
          option_a: -1,
          option_b: -1,
          option_c: -1,
          option_d: -1,
          correct_option: -1,
        };

        for (let r = 0; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!Array.isArray(row)) continue;

          let qCol = -1;
          let aCol = -1;
          let bCol = -1;
          let cCol = -1;
          let dCol = -1;
          let ansCol = -1;

          for (let c = 0; c < row.length; c++) {
            const nh = normalizeHeader(row[c]);
            if (nh === "questiontext" || nh === "question") qCol = c;
            else if (nh === "optiona" || nh === "a") aCol = c;
            else if (nh === "optionb" || nh === "b") bCol = c;
            else if (nh === "optionc" || nh === "c") cCol = c;
            else if (nh === "optiond" || nh === "d") dCol = c;
            else if (nh === "correctoption" || nh === "correct" || nh === "answer") ansCol = c;
          }

          if (
            qCol !== -1 &&
            aCol !== -1 &&
            bCol !== -1 &&
            cCol !== -1 &&
            dCol !== -1 &&
            ansCol !== -1
          ) {
            headerRowIndex = r;
            colMap = {
              question_text: qCol,
              option_a: aCol,
              option_b: bCol,
              option_c: cCol,
              option_d: dCol,
              correct_option: ansCol,
            };
            break;
          }
        }

        if (headerRowIndex === -1) {
          setUploadError(
            "Could not detect question header row. Please ensure columns include Question Text, Option A, Option B, Option C, Option D, and Correct Option."
          );
          setIsParsing(false);
          return;
        }

        const questions: ParsedRowResult[] = [];

        for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!Array.isArray(row)) continue;

          const isRowBlank = row.every((cell) => String(cell || "").trim() === "");
          if (isRowBlank) continue;

          const question_text = String(row[colMap.question_text] || "").trim();
          const option_a = String(row[colMap.option_a] || "").trim();
          const option_b = String(row[colMap.option_b] || "").trim();
          const option_c = String(row[colMap.option_c] || "").trim();
          const option_d = String(row[colMap.option_d] || "").trim();
          const rawCorrect = String(row[colMap.correct_option] || "").trim();
          const correct_option = rawCorrect.toUpperCase();

          if (!question_text && !option_a && !option_b && !option_c && !option_d && !rawCorrect) {
            continue;
          }

          const errors: string[] = [];
          if (!question_text) errors.push("Missing question text");
          if (!option_a) errors.push("Missing Option A");
          if (!option_b) errors.push("Missing Option B");
          if (!option_c) errors.push("Missing Option C");
          if (!option_d) errors.push("Missing Option D");
          if (!["A", "B", "C", "D"].includes(correct_option)) {
            errors.push(`Invalid correct option "${rawCorrect || "(blank)"}". Must be A, B, C, or D`);
          }

          questions.push({
            rowNumber: questions.length + 1,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_option: correct_option || "A",
            isValid: errors.length === 0,
            errors,
          });
        }

        if (questions.length === 0) {
          setUploadError("No question rows found after the header row. Please check your Excel file.");
          setIsParsing(false);
          return;
        }

        setParsedRows(questions);
      } catch (err: any) {
        setUploadError(err.message || "Failed to parse the Excel file. Please ensure it is a valid .xlsx file.");
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setUploadError("Error reading the selected file.");
      setIsParsing(false);
    };

    reader.readAsArrayBuffer(selectedFile);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      processFile(dropped);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;
  const canImport = parsedRows.length > 0 && invalidCount === 0;

  async function handleConfirmImport() {
    if (!canImport) return;

    setIsImporting(true);
    setUploadError(null);

    const payload: MCQQuestionCreatePayload[] = parsedRows.map((r) => ({
      job_id: jobId,
      question_text: r.question_text,
      option_a: r.option_a,
      option_b: r.option_b,
      option_c: r.option_c,
      option_d: r.option_d,
      correct_option: r.correct_option as "A" | "B" | "C" | "D",
      marks: 1,
    }));

    try {
      const created = await createJobQuestionsBulkApi(jobId, payload);
      onSuccess(created.length, created);
      handleClose();
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        (Array.isArray(err?.response?.data?.detail)
          ? err.response.data.detail.map((d: any) => d.msg).join(", ")
          : null) ||
        "Failed to import questions. Please check permissions or file contents.";
      setUploadError(detail);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal/55 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white border border-[#E6E0D6] rounded-2xl shadow-xl flex flex-col my-auto max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 py-4 border-b border-[#E6E0D6] flex items-center justify-between bg-cream/50">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
              Upload MCQ Questions
            </h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              Bulk import multiple-choice questions from an Excel (.xlsx) file.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isImporting}
            className="p-1.5 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-black/5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {uploadError && (
            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{uploadError}</span>
            </div>
          )}

          {!file ? (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-colors ${
                  isDragOver
                    ? "border-terracotta bg-terracotta/5"
                    : "border-[#D6CEC2] bg-[#FAF8F5] hover:bg-cream/60 hover:border-terracotta/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="size-12 rounded-full bg-white border border-[#E6E0D6] shadow-2xs mx-auto flex items-center justify-center text-terracotta mb-3">
                  <FileSpreadsheet className="size-6" />
                </div>

                <h3 className="font-semibold text-sm sm:text-base text-charcoal mb-1">
                  Drag and drop Excel file here
                </h3>
                <p className="text-xs text-[#78716C] mb-4">
                  Supports .xlsx or .xls spreadsheets containing question rows
                </p>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-[#E6E0D6] text-xs font-semibold text-charcoal hover:bg-cream shadow-3xs transition-colors cursor-pointer"
                >
                  <Upload className="size-3.5 text-terracotta" />
                  <span>Choose Excel File</span>
                </button>
              </div>

              <div className="rounded-xl border border-[#E6E0D6] bg-cream/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-semibold text-charcoal block">
                    Need the template format?
                  </span>
                  <span className="text-[#78716C] mt-0.5 block">
                    Download our clean sample Excel template with all 6 required question columns.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#E6E0D6] bg-white text-xs font-semibold text-charcoal hover:bg-cream shadow-3xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Download className="size-3.5 text-terracotta" />
                  <span>Download Template</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#E6E0D6] bg-cream/30">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-white border border-[#E6E0D6] flex items-center justify-center text-terracotta shrink-0 shadow-3xs">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-charcoal truncate max-w-xs sm:max-w-md">
                      {file.name}
                    </h4>
                    <p className="text-[11px] text-[#78716C]">
                      {(file.size / 1024).toFixed(1)} KB &bull; {parsedRows.length} questions detected
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isImporting}
                    className="px-3 py-1.5 rounded-lg border border-[#E6E0D6] bg-white text-xs font-medium text-charcoal hover:bg-cream cursor-pointer disabled:opacity-50"
                  >
                    Change File
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="p-1.5 rounded-lg border border-[#E6E0D6] bg-white text-[#78716C] hover:text-charcoal hover:bg-cream cursor-pointer"
                    title="Download Template"
                  >
                    <Download className="size-4" />
                  </button>
                </div>
              </div>

              {isParsing ? (
                <div className="p-8 text-center space-y-2">
                  <Loader2 className="size-6 animate-spin text-terracotta mx-auto" />
                  <p className="text-xs text-[#78716C]">Validating spreadsheet rows...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-charcoal">
                        Validation Preview
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-cream border border-[#E6E0D6] text-charcoal">
                        {parsedRows.length} total
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                        <CheckCircle2 className="size-3 text-emerald-600" />
                        <span>{validCount} valid</span>
                      </span>
                      {invalidCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                          <AlertTriangle className="size-3 text-amber-600" />
                          <span>{invalidCount} need attention</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {invalidCount > 0 && (
                    <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                      <AlertTriangle className="size-4 text-amber-700 shrink-0 mt-0.5" />
                      <span>
                        Some rows contain missing fields or invalid correct options. Please fix the highlighted rows in your Excel file or re-upload a valid template.
                      </span>
                    </div>
                  )}

                  <div className="border border-[#E6E0D6] rounded-xl overflow-hidden bg-white max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#FAF8F5] border-b border-[#E6E0D6] text-[#78716C] font-semibold sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3 w-10">#</th>
                          <th className="py-2.5 px-3">Question</th>
                          <th className="py-2.5 px-3 w-32">Correct Answer</th>
                          <th className="py-2.5 px-3 w-36">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0ECE4]">
                        {parsedRows.map((r) => (
                          <tr
                            key={r.rowNumber}
                            className={r.isValid ? "hover:bg-cream/30" : "bg-red-50/40 hover:bg-red-50/70"}
                          >
                            <td className="py-2.5 px-3 text-[#78716C] font-mono">{r.rowNumber}</td>
                            <td className="py-2.5 px-3 text-charcoal font-medium">
                              <p className="line-clamp-1">{r.question_text || "(Empty Question)"}</p>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-charcoal">
                              Option {r.correct_option}
                            </td>
                            <td className="py-2.5 px-3">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                                  <CheckCircle2 className="size-3 text-emerald-600" />
                                  <span>Valid</span>
                                </span>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700">
                                    <AlertCircle className="size-3 text-red-600 shrink-0" />
                                    <span>Invalid</span>
                                  </span>
                                  <p className="text-[10px] text-red-600 leading-tight">
                                    {r.errors.join("; ")}
                                  </p>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-[#E6E0D6] bg-cream/40 flex items-center justify-between gap-3 mt-auto">
          <div className="text-xs text-[#78716C]">
            {file && canImport && (
              <span className="text-emerald-800 font-semibold">
                {validCount} questions ready to import
              </span>
            )}
            {file && !canImport && invalidCount > 0 && (
              <span className="text-amber-800 font-medium">
                Resolve all invalid rows to enable import
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isImporting}
              className="px-4 py-2 rounded-lg border border-[#E6E0D6] bg-white text-xs font-semibold text-charcoal hover:bg-cream transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={!canImport || isImporting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <span>Import Questions ({validCount})</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
