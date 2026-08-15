"use client";

import { CONTEXT_META, CONTEXTS, type JuryContext } from "@/lib/jury/types";

interface ContextPickerProps {
  value: JuryContext | null;
  onChange: (context: JuryContext) => void;
  disabled?: boolean;
}

export function ContextPicker({ value, onChange, disabled }: ContextPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {CONTEXTS.map((ctx) => {
        const active = value === ctx;
        return (
          <button
            key={ctx}
            type="button"
            disabled={disabled}
            onClick={() => onChange(ctx)}
            className="rounded-xl border px-2 py-3 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: active ? "var(--accent-b)" : "var(--panel-border)",
              background: active
                ? "linear-gradient(120deg, rgba(255,59,92,0.18), rgba(124,92,255,0.18))"
                : "var(--panel)",
              color: active ? "var(--foreground)" : "var(--muted)",
            }}
          >
            {CONTEXT_META[ctx].label}
          </button>
        );
      })}
    </div>
  );
}
