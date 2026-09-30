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
        Salary Range (Annual in INR) <span className="text-terracotta">*</span>
      </label>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-xs sm:text-sm font-semibold text-charcoal select-none">₹</span>
          <input
            id="salary-min"
            type="number"
            min="1"
            value={salaryMin}
            onChange={(e) => onMinChange(e.target.value.replace(/\D/g, ""))}
            placeholder="Min"
            aria-label="Minimum annual salary in INR"
            className="w-full px-3 py-2 bg-cream border border-[#E6E0D6] rounded-lg text-xs sm:text-sm text-charcoal placeholder-[#A8A199] outline-none focus:bg-white focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-all shadow-3xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <span className="text-[#78716C] text-xs font-medium shrink-0">–</span>
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-xs sm:text-sm font-semibold text-charcoal select-none">₹</span>
          <input
            id="salary-max"
            type="number"
            min="1"
            value={salaryMax}
            onChange={(e) => onMaxChange(e.target.value.replace(/\D/g, ""))}
            placeholder="Max"
            aria-label="Maximum annual salary in INR"
            className="w-full px-3 py-2 bg-cream border border-[#E6E0D6] rounded-lg text-xs sm:text-sm text-charcoal placeholder-[#A8A199] outline-none focus:bg-white focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-all shadow-3xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>
    </div>
  );
}

