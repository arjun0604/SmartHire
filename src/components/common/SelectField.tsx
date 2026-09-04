interface SelectFieldProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  required?: boolean;
}

export function SelectField({ label, value, options, onChange, required }: SelectFieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-charcoal mb-1.5">
        {label} {required && <span className="text-terracotta">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E6E0D6] rounded-lg text-xs sm:text-sm text-charcoal outline-none focus:bg-white focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-all cursor-pointer shadow-3xs"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#78716C] text-[10px]">
          ▼
        </div>
      </div>
    </div>
  );
}
