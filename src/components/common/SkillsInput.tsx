import { useState } from "react"
import { X, Plus } from "lucide-react"

interface SkillsInputProps {
  skills: string[];
  onChange: (newSkills: string[]) => void;
}

export function SkillsInput({ skills, onChange }: SkillsInputProps) {
  const [input, setInput] = useState("");

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!skills.includes(trimmed)) {
      onChange([...skills, trimmed]);
    }
    setInput("");
  };

  const handleRemove = (skillToRemove: string) => {
    onChange(skills.filter((s) => s !== skillToRemove));
  };

  return (
    <div className="p-2.5 bg-[#FAF8F5] border border-[#E6E0D6] rounded-lg space-y-2 focus-within:border-terracotta focus-within:ring-1 focus-within:ring-terracotta focus-within:bg-white transition-all shadow-3xs">
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FAF2EE] border border-terracotta/20 text-xs font-medium text-terracotta"
          >
            {skill}
            <button
              type="button"
              onClick={() => handleRemove(skill)}
              className="hover:text-terracotta-dark cursor-pointer text-terracotta/70"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Type a skill and press Enter..."
          className="flex-1 bg-transparent text-xs sm:text-sm text-charcoal placeholder-[#A8A199] outline-none py-1"
        />
        <button
          type="button"
          onClick={() => handleAdd()}
          className="px-2.5 py-1 rounded-md bg-white border border-[#E6E0D6] text-xs font-medium text-charcoal hover:border-terracotta hover:text-terracotta transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Plus className="size-3" />
          <span>Add</span>
        </button>
      </div>
    </div>
  );
}
