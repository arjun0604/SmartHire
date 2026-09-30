export function formatSalary(val?: number | string | null): string {
  if (val === undefined || val === null || val === "") return "";
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.]/g, ""));
  if (isNaN(num) || num <= 0) return "";
  if (num >= 100000) {
    const lakh = num / 100000;
    const rounded = parseFloat(lakh.toFixed(2));
    return `₹${rounded}L`;
  }
  if (num >= 1000) {
    const k = num / 1000;
    const rounded = parseFloat(k.toFixed(2));
    return `₹${rounded}k`;
  }
  return `₹${num}`;
}

export function formatSalaryRange(min?: number | string | null, max?: number | string | null): string {
  const minFormatted = formatSalary(min);
  const maxFormatted = formatSalary(max);
  if (minFormatted && maxFormatted) {
    return `${minFormatted} – ${maxFormatted}`;
  }
  if (minFormatted) return `${minFormatted}+`;
  if (maxFormatted) return `Up to ${maxFormatted}`;
  return "";
}
