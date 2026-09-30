import React from "react"

interface SemicircleMeterProps {
  value: number;
  color?: string;
  textColor?: string;
  trackColor?: string;
  className?: string;
}

export const SemicircleMeter: React.FC<SemicircleMeterProps> = ({
  value,
  color = "#10B981",
  textColor = "text-emerald-700",
  trackColor = "#F3EFEA",
  className = "",
}) => {
  const clamped = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = 106.8 - (106.8 * (clamped / 100));

  return (
    <div className={`relative w-22 sm:w-24 h-14 flex flex-col items-center justify-end shrink-0 ${className}`.trim()}>
      <svg className="w-22 sm:w-24 h-11" viewBox="0 0 80 40">
        <path
          d="M 6 38 A 34 34 0 0 1 74 38"
          fill="none"
          stroke={trackColor}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 6 38 A 34 34 0 0 1 74 38"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="106.8"
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className={`text-xs font-semibold ${textColor} flex items-center gap-0.5 mt-0.5`}>
        {Math.round(clamped)}%
      </span>
    </div>
  );
};
