/**
 * Standardized Assessment Status utilities and configuration.
 * Single source of truth for statuses, labels, colors, and filters.
 *
 * Status-to-color mapping:
 * - Closed: Red (Assessment is no longer accepting/available)
 * - Not Started: Gray (Assessment exists but no candidate has started it)
 * - In Progress / Started: Blue (Assessment has been started and is currently active)
 * - Completed: Green (Assessment has been completed)
 * - Expired: Orange (Assessment passed its deadline)
 * - Scheduled: Purple (Assessment is scheduled but not yet active)
 * - Unknown: Neutral Gray fallback
 */

export type CanonicalAssessmentStatus =
  | "CLOSED"
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "EXPIRED"
  | "SCHEDULED"
  | "UNKNOWN";

export interface AssessmentFilterOption {
  label: string;
  value: string;
}

/**
 * Filter dropdown options for recruiter assessment views.
 * Named: "Status"
 */
export const ASSESSMENT_STATUS_FILTER_OPTIONS: AssessmentFilterOption[] = [
  { label: "All Statuses", value: "all" },
  { label: "Not Started", value: "NOT_STARTED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Closed", value: "CLOSED" },
  { label: "Expired", value: "EXPIRED" },
  { label: "Scheduled", value: "SCHEDULED" },
];

/**
 * Normalizes any backend or legacy status string into canonical assessment status.
 */
export function normalizeAssessmentStatus(
  status?: string | null,
  deadline?: string | null
): CanonicalAssessmentStatus {
  if (!status) return "NOT_STARTED";
  const s = status.toUpperCase().trim();

  if (s === "CLOSED") return "CLOSED";
  if (s === "EXPIRED" || s === "TIMED_OUT" || s === "TIMED OUT") return "EXPIRED";

  // Check if assessment/job deadline has passed
  if (deadline) {
    const d = new Date(deadline);
    if (!isNaN(d.getTime()) && d < new Date() && s !== "CLOSED" && s !== "COMPLETED" && s !== "SUBMITTED") {
      return "EXPIRED";
    }
  }

  if (s === "SCHEDULED" || s === "CONFIGURED") return "SCHEDULED";
  if (s === "ACTIVE" || s === "STARTED" || s === "IN_PROGRESS" || s === "IN PROGRESS") return "IN_PROGRESS";
  if (s === "COMPLETED" || s === "SUBMITTED") return "COMPLETED";
  if (s === "NOT_STARTED" || s === "NOT STARTED" || s === "DRAFT") return "NOT_STARTED";

  return "UNKNOWN";
}

/**
 * Human-readable status label.
 * Never outputs variants like STARTED, started, IN_PROGRESS, etc.
 */
export function getAssessmentStatusLabel(
  status?: string | null,
  deadline?: string | null
): string {
  const norm = normalizeAssessmentStatus(status, deadline);
  switch (norm) {
    case "CLOSED":
      return "Closed";
    case "NOT_STARTED":
      return "Not Started";
    case "IN_PROGRESS":
      return "In Progress";
    case "COMPLETED":
      return "Completed";
    case "EXPIRED":
      return "Expired";
    case "SCHEDULED":
      return "Scheduled";
    case "UNKNOWN":
    default:
      if (!status) return "Not Started";
      return status
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/**
 * Standard status badge classes (background, text, border).
 */
export function getAssessmentStatusBadgeClasses(
  status?: string | null,
  deadline?: string | null
): string {
  const norm = normalizeAssessmentStatus(status, deadline);
  switch (norm) {
    case "CLOSED":
      return "bg-red-50 text-red-800 border-red-200"; // Red
    case "NOT_STARTED":
      return "bg-stone-100 text-stone-700 border-stone-200"; // Gray
    case "IN_PROGRESS":
      return "bg-blue-50 text-blue-800 border-blue-200"; // Blue
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-800 border-emerald-200"; // Green
    case "EXPIRED":
      return "bg-orange-50 text-orange-800 border-orange-200"; // Orange
    case "SCHEDULED":
      return "bg-purple-50 text-purple-800 border-purple-200"; // Purple
    case "UNKNOWN":
    default:
      return "bg-stone-100 text-stone-600 border-stone-200"; // Neutral fallback
  }
}

/**
 * Visual indicator dot classes for immediate status hierarchy.
 */
export function getAssessmentStatusDotClasses(
  status?: string | null,
  deadline?: string | null
): string {
  const norm = normalizeAssessmentStatus(status, deadline);
  switch (norm) {
    case "CLOSED":
      return "bg-red-500";
    case "NOT_STARTED":
      return "bg-stone-400";
    case "IN_PROGRESS":
      return "bg-blue-500";
    case "COMPLETED":
      return "bg-emerald-500";
    case "EXPIRED":
      return "bg-orange-500";
    case "SCHEDULED":
      return "bg-purple-500";
    case "UNKNOWN":
    default:
      return "bg-stone-400";
  }
}

/**
 * Descriptive human-readable assessment details.
 */
export function getAssessmentStatusDescription(
  status?: string | null,
  deadline?: string | null
): string {
  const norm = normalizeAssessmentStatus(status, deadline);
  switch (norm) {
    case "CLOSED":
      return "Assessment is no longer accepting/available";
    case "NOT_STARTED":
      return "Assessment exists but no candidate has started it";
    case "IN_PROGRESS":
      return "Assessment has been started and is currently active";
    case "COMPLETED":
      return "Assessment has been completed";
    case "EXPIRED":
      return "Assessment passed its deadline";
    case "SCHEDULED":
      return "Assessment is scheduled but not yet active";
    case "UNKNOWN":
    default:
      return "Assessment status updated";
  }
}
