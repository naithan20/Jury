"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ContextPicker } from "./ContextPicker";
import { ImageSlot } from "./ImageSlot";
import { ResultReveal } from "./ResultReveal";
import { CONTEXT_META, type JuryContext, type JuryResult } from "@/lib/jury/types";

const LOADING_LINES = [
  "Empaneling 100 synthetic jurors…",
  "Briefing the bold-and-novelty bloc…",
  "Cross-examining the analytical types…",
  "Weighing status signals…",
  "Tallying the votes…",
];

interface JuryFlowProps {
  lockedImage?: { image: string; label: "A" | "B" };
  lockedContext?: JuryContext;
  hero?: ReactNode;
}

export function JuryFlow({ lockedImage, lockedContext, hero }: JuryFlowProps) {
  const [imageA, setImageA] = useState<string | null>(
    lockedImage?.label === "A" ? lockedImage.image : null,
  );
  const [imageB, setImageB] = useState<string | null>(
    lockedImage?.label === "B" ? lockedImage.image : null,
  );
  const [context, setContext] = useState<JuryContext | null>(lockedContext ?? null);
  const [step, setStep] = useState<"setup" | "loading" | "result">("setup");
  const [result, setResult] = useState<JuryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingLine, setLoadingLine] = useState(0);

  useEffect(() => {
    if (step !== "loading") return;
    const interval = setInterval(() => {
      setLoadingLine((i) => (i + 1) % LOADING_LINES.length);
    }, 1400);
    return () => clearInterval(interval);
  }, [step]);

  const ready = !!imageA && !!imageB && !!context;

  async function runJury() {
    if (!imageA || !imageB || !context) return;
    setStep("loading");
    setError(null);
    try {
      const res = await fetch("/api/jury", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageA, imageB, context }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong.");
      }
      setResult(data.result as JuryResult);
      setStep("result");
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
      setStep("setup");
    }
  }

  function reset() {
    setImageA(lockedImage?.label === "A" ? lockedImage.image : null);
    setImageB(lockedImage?.label === "B" ? lockedImage.image : null);
    setContext(lockedContext ?? null);
    setResult(null);
    setStep("setup");
  }

  if (step === "result" && result && imageA && imageB && context) {
    return (
      <ResultReveal
        result={result}
        imageA={imageA}
        imageB={imageB}
        context={context}
        defending={!!lockedImage}
        onRunAnother={reset}
      />
    );
  }

  if (step === "loading") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
        <div className="verdict-font text-2xl gradient-text">JURY IS DELIBERATING</div>
        <div className="relative h-2 w-56 overflow-hidden rounded-full" style={{ background: "var(--panel-border)" }}>
          <div className="absolute inset-y-0 left-0 w-1/3 animate-[loading-slide_1.2s_ease-in-out_infinite] rounded-full" style={{ background: "linear-gradient(90deg, var(--accent-a), var(--accent-b))" }} />
        </div>
        <p className="min-h-[1.5em] text-sm text-[var(--muted)]">{LOADING_LINES[loadingLine]}</p>
        <style>{`@keyframes loading-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      {hero}

      {lockedImage && (
        <div className="animate-fade-up rounded-xl border p-3 text-center text-sm" style={{ borderColor: "var(--accent-b)", background: "rgba(124,92,255,0.08)" }}>
          You&apos;ve been challenged. Upload your photo to face the defending champion.
        </div>
      )}

      <div className="flex gap-3">
        <ImageSlot
          label="A"
          accent="a"
          image={imageA}
          onChange={setImageA}
          onClear={() => setImageA(null)}
          locked={lockedImage?.label === "A"}
        />
        <ImageSlot
          label="B"
          accent="b"
          image={imageB}
          onChange={setImageB}
          onClear={() => setImageB(null)}
          locked={lockedImage?.label === "B"}
        />
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-[var(--muted)]">
          {lockedContext
            ? `Context: ${CONTEXT_META[lockedContext].label} (locked to match the original)`
            : "Pick the outcome"}
        </p>
        <ContextPicker value={context} onChange={setContext} disabled={!!lockedContext} />
      </div>

      {error && (
        <p className="rounded-xl border p-3 text-center text-sm text-[var(--accent-a)]" style={{ borderColor: "var(--accent-a)" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!ready}
        onClick={runJury}
        className="verdict-font w-full rounded-full py-4 text-lg tracking-wide text-black transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        style={{ background: "linear-gradient(100deg, var(--accent-a), var(--accent-b))" }}
      >
        RUN JURY
      </button>
    </div>
  );
}
