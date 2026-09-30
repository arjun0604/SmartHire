export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

function result(isValid: boolean, error: string | null = null): ValidationResult {
  return { isValid, error };
}

export function validateName(val?: string | null, fieldLabel: string = "Name"): ValidationResult {
  if (val === null || val === undefined) {
    return result(false, `${fieldLabel} is required.`);
  }
  const trimmed = val.trim();
  if (!trimmed) {
    return result(false, `${fieldLabel} is required.`);
  }
  if (trimmed.length < 2) {
    return result(false, `${fieldLabel} must be at least 2 characters.`);
  }
  if (trimmed.length > 255) {
    return result(false, `${fieldLabel} cannot exceed 255 characters.`);
  }
  if (!/\p{L}/u.test(trimmed)) {
    return result(false, `${fieldLabel} must contain at least one letter.`);
  }
  if (/^\d+$/.test(trimmed)) {
    return result(false, `${fieldLabel} cannot be purely numeric.`);
  }
  if (/^[^\p{L}0-9]+$/u.test(trimmed)) {
    return result(false, `${fieldLabel} cannot be purely symbols.`);
  }
  return result(true, null);
}

export function validateEmail(val?: string | null): ValidationResult {
  if (val === null || val === undefined) {
    return result(false, "Email Address is required.");
  }
  const trimmed = val.trim();
  if (!trimmed) {
    return result(false, "Email Address is required.");
  }
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return result(false, "Please enter a valid email address.");
  }
  return result(true, null);
}

export function normalizeIndianPhone(val: string): string {
  const trimmed = val.trim();
  if (!trimmed) return "";
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return trimmed;
}

export function validateIndianPhone(val?: string | null, required: boolean = true): ValidationResult {
  if (val === null || val === undefined) {
    return required ? result(false, "Phone Number is required.") : result(true, null);
  }
  const trimmed = val.trim();
  if (!trimmed) {
    return required ? result(false, "Phone Number is required.") : result(true, null);
  }
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }
  if (digits.length !== 10 || !/^[6-9]\d{9}$/.test(digits)) {
    return result(false, "Please enter a valid 10-digit Indian phone number (e.g. +91 98765 43210).");
  }
  return result(true, null);
}

export function validateJobTitle(val?: string | null): ValidationResult {
  if (val === null || val === undefined) {
    return result(false, "Job Title is required.");
  }
  const trimmed = val.trim();
  if (!trimmed) {
    return result(false, "Job Title is required.");
  }
  if (trimmed.length < 3) {
    return result(false, "Job Title must be at least 3 characters.");
  }
  if (trimmed.length > 100) {
    return result(false, "Job Title cannot exceed 100 characters.");
  }
  if (!/[a-zA-Z]/.test(trimmed)) {
    return result(false, "Job Title must contain letters.");
  }
  if (/^\d+$/.test(trimmed)) {
    return result(false, "Job Title cannot be purely numeric.");
  }
  if (/^[^\p{L}0-9]+$/u.test(trimmed)) {
    return result(false, "Job Title cannot be purely symbols.");
  }
  return result(true, null);
}

export function validateCompanyName(val?: string | null): ValidationResult {
  if (val === null || val === undefined) {
    return result(false, "Company name is required.");
  }
  const trimmed = val.trim();
  if (!trimmed) {
    return result(false, "Company name is required.");
  }
  if (trimmed.length < 2) {
    return result(false, "Company name must be at least 2 characters.");
  }
  if (trimmed.length > 255) {
    return result(false, "Company name cannot exceed 255 characters.");
  }
  if (!/[\p{L}0-9]/u.test(trimmed)) {
    return result(false, "Company name must contain valid alphanumeric characters.");
  }
  if (/^\d+$/.test(trimmed)) {
    return result(false, "Company name cannot be purely numeric.");
  }
  if (/^[^\p{L}0-9]+$/u.test(trimmed)) {
    return result(false, "Company name cannot be purely symbols.");
  }
  return result(true, null);
}

export function validateLocation(
  val?: string | null,
  fieldLabelOrRequired: string | boolean = "Location",
  optionalRequired?: boolean
): ValidationResult {
  let fieldLabel = "Location";
  let required = true;

  if (typeof fieldLabelOrRequired === "boolean") {
    required = fieldLabelOrRequired;
    if (typeof optionalRequired === "string") {
      fieldLabel = optionalRequired;
    }
  } else if (typeof fieldLabelOrRequired === "string") {
    fieldLabel = fieldLabelOrRequired;
    if (typeof optionalRequired === "boolean") {
      required = optionalRequired;
    }
  }

  if (val === null || val === undefined) {
    return required ? result(false, `${fieldLabel} is required.`) : result(true, null);
  }
  const trimmed = val.trim();
  if (!trimmed) {
    return required ? result(false, `${fieldLabel} is required.`) : result(true, null);
  }
  if (trimmed.length < 2) {
    return result(false, `${fieldLabel} must be at least 2 characters.`);
  }
  if (trimmed.length > 255) {
    return result(false, `${fieldLabel} cannot exceed 255 characters.`);
  }
  if (!/[\p{L}0-9]/u.test(trimmed)) {
    return result(false, `${fieldLabel} must contain valid alphanumeric characters.`);
  }
  if (/^[^\p{L}0-9]+$/u.test(trimmed)) {
    return result(false, `${fieldLabel} cannot be purely symbols.`);
  }
  return result(true, null);
}

export function validateMeaningfulText(
  val?: string | null,
  minLen: number = 10,
  maxLen: number = 5000,
  fieldLabel: string = "Description",
  required: boolean = true
): ValidationResult {
  if (val === null || val === undefined) {
    return required ? result(false, `${fieldLabel} is required.`) : result(true, null);
  }
  const trimmed = val.trim();
  if (!trimmed) {
    return required ? result(false, `${fieldLabel} is required.`) : result(true, null);
  }
  if (trimmed.length < minLen) {
    return result(false, `${fieldLabel} must be at least ${minLen} characters.`);
  }
  if (trimmed.length > maxLen) {
    return result(false, `${fieldLabel} cannot exceed ${maxLen} characters.`);
  }
  if (!/[\p{L}0-9]/u.test(trimmed)) {
    return result(false, `${fieldLabel} must contain meaningful text.`);
  }
  if (/^[^\p{L}0-9]+$/u.test(trimmed)) {
    return result(false, `${fieldLabel} cannot be purely symbols.`);
  }
  return result(true, null);
}

export function validateUrl(
  val?: string | null,
  fieldLabelOrRequired: string | boolean = "URL",
  optionalRequired: boolean = false
): ValidationResult {
  let fieldLabel = "URL";
  let required = false;

  if (typeof fieldLabelOrRequired === "boolean") {
    required = fieldLabelOrRequired;
    if (typeof optionalRequired === "string") {
      fieldLabel = optionalRequired;
    }
  } else if (typeof fieldLabelOrRequired === "string") {
    fieldLabel = fieldLabelOrRequired;
    if (typeof optionalRequired === "boolean") {
      required = optionalRequired;
    }
  }

  if (val === null || val === undefined) {
    return required ? result(false, `${fieldLabel} is required.`) : result(true, null);
  }
  const trimmed = val.trim();
  if (!trimmed) {
    return required ? result(false, `${fieldLabel} is required.`) : result(true, null);
  }
  try {
    const parsed = new URL(trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`);
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      return result(false, `Please enter a valid ${fieldLabel} (e.g. https://example.com).`);
    }
  } catch {
    return result(false, `Please enter a valid ${fieldLabel} (e.g. https://example.com).`);
  }
  return result(true, null);
}

export function validateFoundedYear(val?: string | number | null, required: boolean = false): ValidationResult {
  if (val === null || val === undefined || String(val).trim() === "") {
    return required ? result(false, "Founded year is required.") : result(true, null);
  }
  const s = String(val).trim();
  if (!/^\d{4}$/.test(s)) {
    return result(false, "Founded year must be a 4-digit year (e.g. 2020).");
  }
  const year = parseInt(s, 10);
  const currentYear = new Date().getFullYear();
  if (year < 1800 || year > currentYear) {
    return result(false, `Founded year must be between 1800 and ${currentYear}.`);
  }
  return result(true, null);
}

export function validateDateOfBirth(val?: string | Date | null): ValidationResult {
  if (!val) {
    return result(false, "Date of birth is required.");
  }
  const birthDate = new Date(val);
  if (isNaN(birthDate.getTime())) {
    return result(false, "Please enter a valid date of birth.");
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(birthDate);
  checkDate.setHours(0, 0, 0, 0);
  if (checkDate.getTime() >= today.getTime()) {
    return result(false, "Date of birth must be in the past.");
  }
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < 14) {
    return result(false, "Candidate must be at least 14 years old.");
  }
  if (age > 100) {
    return result(false, "Please enter a realistic date of birth.");
  }
  return result(true, null);
}

export function validateDeadline(val?: string | Date | null, initialDeadline?: string | null): ValidationResult {
  if (!val) {
    return result(false, "Application deadline is required.");
  }
  const trimmed = typeof val === "string" ? val.trim() : "";
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    return result(false, "Please select a valid application deadline date.");
  }
  if (initialDeadline && trimmed === initialDeadline) {
    return result(true, null);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const check = new Date(d);
  check.setHours(0, 0, 0, 0);
  if (check.getTime() < today.getTime()) {
    return result(false, "Application deadline must be today or a future date.");
  }
  return result(true, null);
}

export function validateSalaryRange(minVal?: string | number | null, maxVal?: string | number | null): ValidationResult {
  const minStr = String(minVal ?? "").trim();
  const maxStr = String(maxVal ?? "").trim();
  if (!minStr || !maxStr) {
    return result(false, "Both minimum and maximum salary are required.");
  }
  const min = Number(minStr);
  const max = Number(maxStr);
  if (isNaN(min) || min <= 0) {
    return result(false, "Minimum salary must be greater than 0.");
  }
  if (isNaN(max) || max <= 0) {
    return result(false, "Maximum salary must be greater than 0.");
  }
  if (min > max) {
    return result(false, "Minimum salary cannot exceed maximum salary.");
  }
  if (max > 1000000000) {
    return result(false, "Salary amount exceeds the maximum allowable limit (₹100 Cr).");
  }
  return result(true, null);
}

export function validateSkill(val?: string | null): ValidationResult {
  if (val === null || val === undefined) {
    return result(false, "Skill name cannot be empty.");
  }
  const trimmed = val.trim();
  if (!trimmed) {
    return result(false, "Skill name cannot be empty.");
  }
  if (trimmed.length < 1 || trimmed.length > 50) {
    return result(false, "Skill must be between 1 and 50 characters.");
  }
  if (!/[\p{L}0-9]/u.test(trimmed)) {
    return result(false, "Skill must contain valid alphanumeric characters.");
  }
  if (/^\d+$/.test(trimmed)) {
    return result(false, "Skill cannot be purely numeric.");
  }
  if (/^[^\p{L}0-9]+$/u.test(trimmed)) {
    return result(false, "Skill cannot be purely symbols.");
  }
  return result(true, null);
}

export function validateBulletItem(val?: string | null, label: string = "Item"): ValidationResult {
  if (val === null || val === undefined) {
    return result(false, `${label} cannot be empty.`);
  }
  const trimmed = val.trim().replace(/^[-*•]\s*/, "");
  if (!trimmed) {
    return result(false, `${label} cannot be empty.`);
  }
  if (trimmed.length < 3) {
    return result(false, `${label} must be at least 3 characters.`);
  }
  if (trimmed.length > 500) {
    return result(false, `${label} cannot exceed 500 characters.`);
  }
  if (!/[\p{L}0-9]/u.test(trimmed)) {
    return result(false, `${label} must contain meaningful text.`);
  }
  if (/^\d+$/.test(trimmed)) {
    return result(false, `${label} cannot be purely numeric.`);
  }
  if (/^[^\p{L}0-9]+$/u.test(trimmed)) {
    return result(false, `${label} cannot be purely symbols.`);
  }
  return result(true, null);
}
