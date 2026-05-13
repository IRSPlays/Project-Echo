import React, { useRef, useEffect } from "react";

interface EchoInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function EchoInput({ value, onChange, onSubmit, disabled }: EchoInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(100, textareaRef.current.scrollHeight)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  const charCount = value.length;
  const isOverLimit = charCount > 2000;

  return (
    <div className="flex flex-col w-full max-w-3xl border border-echo-border bg-echo-surface focus-glow transition-all duration-200">
      <div className="flex items-center px-4 py-2 border-b border-echo-border bg-echo-black text-echo-dim text-xs uppercase tracking-wider">
        <span>sys.input</span>
        <span className="mx-2">|</span>
        <span>Ctrl+Enter to Transmit</span>
        <div className="ml-auto flex items-center gap-2">
          <span className={isOverLimit ? "text-echo-red" : "text-echo-green"}>
            {charCount}/2000
          </span>
          <div className={`w-2 h-2 ${charCount > 0 ? "bg-echo-green animate-pulse" : "bg-echo-dim"}`} />
        </div>
      </div>
      
      <div className="relative p-4 flex">
        <span className="text-echo-dim mr-2 select-none">&gt;</span>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="TYPE YOUR REPORT HERE..."
          className="w-full bg-transparent text-echo-text font-mono text-sm leading-relaxed outline-none resize-none placeholder:text-echo-dim"
          spellCheck="false"
        />
        {value === "" && !disabled && (
          <span className="absolute top-4 left-[30px] pointer-events-none text-echo-green animate-blink">_</span>
        )}
      </div>
    </div>
  );
}
