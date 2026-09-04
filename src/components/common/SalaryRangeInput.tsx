import { formatCurrencyInput } from "../../constants/jobOptions"

interface SalaryRangeInputProps {
  salaryMin: string;
  salaryMax: string;
  onMinChange: (val: string) => void;
  onMaxChange: (val: string) => void;
}

export function SalaryRangeInput({ salaryMin, salaryMax, onMinChange, onMaxChange }: SalaryRangeInputProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-charcoal mb-1.5">
        Salary Range (Annual)
      </label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#78716C]">₹</span>
          <input
            type="text"
            inputMode="numeric"
            value={salaryMin}
            onChange={(e) => onMinChange(formatCurrencyInput(e.target.value))}
            placeholder="Min (e.g. 8,00,000)"
            className="w-full pl-7 pr-3 py-2 bg-[#FAF8F5] border border-[#E6E0D6] rounded-lg text-xs sm:text-sm text-charcoal placeholder-[#A8A199] outline-none focus:bg-white focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-all shadow-3xs"
          />
        </div>
        <span className="text-[#78716C] text-xs font-medium">–</span>
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#78716C]">₹</span>
          <input
            type="text"
            inputMode="numeric"
            value={salaryMax}
            onChange={(e) => onMaxChange(formatCurrencyInput(e.target.value))}
            placeholder="Max (e.g. 15,00,000)"
            className="w-full pl-7 pr-3 py-2 bg-[#FAF8F5] border border-[#E6E0D6] rounded-lg text-xs sm:text-sm text-charcoal placeholder-[#A8A199] outline-none focus:bg-white focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-all shadow-3xs"
          />
        </div>
      </div>
    </div>
  );
}
