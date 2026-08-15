"use client";

import { useRef, useState } from "react";

interface ImageSlotProps {
  label: string;
  image: string | null;
  onChange: (dataUrl: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  locked?: boolean;
  accent: "a" | "b";
}

export function ImageSlot({
  label,
  image,
  onChange,
  onClear,
  disabled,
  locked,
  accent,
}: ImageSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accentColor = accent === "a" ? "var(--accent-a)" : "var(--accent-b)";

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That's not an image file.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { compressImageToMaxBytes } = await import("@/lib/jury/compressImage");
      const dataUrl = await compressImageToMaxBytes(file, 1_500_000);
      onChange(dataUrl);
    } catch {
      setError("Couldn't read that image. Try another.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 min-w-0">
      <button
        type="button"
        disabled={disabled || locked}
        onClick={() => inputRef.current?.click()}
        className="group relative w-full aspect-[3/4] rounded-2xl border-2 border-dashed overflow-hidden transition-colors disabled:cursor-not-allowed"
        style={{
          borderColor: image ? accentColor : "var(--panel-border)",
          background: "var(--panel)",
        }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={`${label} preview`} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold"
              style={{ background: "var(--panel-border)", color: "var(--muted)" }}
            >
              +
            </span>
            <span className="text-sm text-[var(--muted)]">
              {busy ? "Processing…" : "Tap to upload"}
            </span>
          </div>
        )}

        <span
          className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold verdict-font"
          style={{ background: accentColor, color: "#08080b" }}
        >
          {label}
        </span>

        {image && !locked && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
            Change
          </span>
        )}

        {locked && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
            Defending
          </span>
        )}
      </button>

      {image && !locked && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          Remove
        </button>
      )}

      {error && <p className="mt-1.5 text-xs text-[var(--accent-a)]">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
