import React from "react";

interface CategoryPickerProps {
  selected: string;
  onSelect: (cat: string) => void;
  disabled?: boolean;
}

const CATEGORIES = ["Facilities", "Culture", "Academics", "Safety"];

export function CategoryPicker({ selected, onSelect, disabled }: CategoryPickerProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {CATEGORIES.map((cat) => {
        const isActive = selected === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onSelect(cat)}
            disabled={disabled}
            className={`
              relative px-6 py-3 font-mono text-sm uppercase tracking-wider border transition-all duration-200
              ${isActive 
                ? "border-echo-green bg-echo-green-dim text-echo-green shadow-[0_0_10px_rgba(0,255,65,0.2)]" 
                : "border-echo-border bg-echo-surface text-echo-dim hover:text-echo-text hover:border-echo-dim"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              active:translate-y-[2px]
            `}
          >
            {isActive && (
              <span className="absolute top-0 left-0 w-1 h-full bg-echo-green" />
            )}
            [{cat}]
          </button>
        );
      })}
    </div>
  );
}
