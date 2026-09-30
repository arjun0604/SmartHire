export const DEPARTMENTS = [
  "Engineering",
  "Product & Design",
  "Data & AI",
  "Marketing & Growth",
  "Sales & Operations",
  "Finance & Legal",
];

export const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];
export const WORK_MODES = ["Hybrid", "Remote", "On-site"];
export const EXPERIENCE_LEVELS = ["Entry Level", "1 year", "2-3 years", "3-5 years", "5-8 years", "8+ years / Lead"];
export const EDUCATION_LEVELS = ["Bachelor's", "Master's", "PhD / Doctorate", "Diploma / Associate", "Any Degree"];


export function getTomorrowISODate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const dd = String(tomorrow.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getDefaultDeadlineISODate(daysAhead = 5): string {
  const target = new Date();
  target.setDate(target.getDate() + daysAhead);
  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
