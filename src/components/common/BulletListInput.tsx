import { useState } from "react"
import { Plus, X } from "lucide-react"
import { validateBulletItem } from "../../utils/validation"

interface BulletListInputProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  required?: boolean;
  bulletColorClass?: string;
  maxItems?: number;
}

export function BulletListInput({
  label,
  items,
  onChange,
  placeholder = "Add an item and press Enter or paste multiple lines...",
  required = false,
  bulletColorClass = "bg-terracotta",
  maxItems = 30,
}: BulletListInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addItems = (newLines: string[]) => {
    const validLines = newLines
      .map((l) => l.trim().replace(/^[-*•]\s*/, ""))
      .filter((l) => l.length > 0 && validateBulletItem(l, label).isValid && !items.some((it) => it.toLowerCase() === l.toLowerCase()));

    if (validLines.length === 0) return;
    const combined = [...items, ...validLines].slice(0, maxItems);
    onChange(combined);
    setInputValue("");
  };

  const handleAddSingle = () => {
    if (!inputValue.trim()) return;
    addItems([inputValue]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSingle();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (text && text.includes("\n")) {
      e.preventDefault();
      const lines = text.split("\n");
      addItems(lines);
    }
  };

  const handleRemove = (indexToRemove: number) => {
    onChange(items.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-charcoal">
          {label} {required && <span className="text-terracotta">*</span>}
        </label>
        {items.length > 0 && (
          <span className="text-[11px] text-[#8E877D]">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={items.length >= maxItems}
          placeholder={items.length >= maxItems ? `Maximum limit reached (${maxItems})` : placeholder}
          className="flex-1 px-3.5 py-2 bg-cream border border-[#E6E0D6] rounded-lg text-xs sm:text-sm text-charcoal placeholder-[#A8A199] outline-none focus:bg-white focus:border-terracotta focus:ring-1 focus:ring-terracotta transition-all shadow-3xs disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleAddSingle}
          disabled={items.length >= maxItems || !inputValue.trim()}
          className="px-3 py-2 rounded-lg bg-white border border-[#E6E0D6] text-xs font-medium text-charcoal hover:border-terracotta hover:text-terracotta transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Plus className="size-3.5" />
          <span>Add</span>
        </button>
      </div>

      {items.length > 0 && (
        <ul className="space-y-1.5 pt-1 max-h-48 overflow-y-auto pr-1">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="group flex items-start justify-between gap-2.5 p-2 rounded-lg bg-cream border border-[#E6E0D6]/80 text-xs text-charcoal hover:bg-white transition-colors"
            >
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <span className={`size-1.5 rounded-full ${bulletColorClass} mt-1.5 shrink-0`} />
                <span className="leading-relaxed wrap-break-word">{item}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="text-[#8E877D] hover:text-terracotta cursor-pointer p-0.5 rounded transition-colors shrink-0"
                aria-label="Remove item"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
