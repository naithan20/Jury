"use client";

import { useEffect, useState } from "react";
import { CONTEXT_META, PERSONAS, type JuryContext, type JuryResult } from "@/lib/jury/types";
import { useCountUp } from "@/lib/jury/useCountUp";
import { ShareActions } from "./ShareActions";

interface ResultRevealProps {
  result: JuryResult;
  imageA: string;
  imageB: string;
  context: JuryContext;
  defending?: boolean;
  onRunAnother: () => void;
}

const CONFIDENCE_LABEL: Record<JuryResult["confidence"], string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

export function ResultReveal({
  result,
  imageA,
  imageB,
  context,
  defending,
  onRunAnother,
}: ResultRevealProps) {
  const [stage, setStage] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 1300);
    const t2 = setTimeout(() => setStage(2), 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const countA = useCountUp(result.votesA, 1100, true);
  const countB = useCountUp(result.votesB, 1100, true);
  const winnerVotes = result.winner === "A" ? result.votesA : result.votesB;
  const winnerImage = result.winner === "A" ? imageA : imageB;

  const segmentsForWinner = result.segments.filter((s) => s.favors === result.winner);
  const segmentsForLoser = result.segments.filter((s) => s.favors !== result.winner);
  const loserLabel = result.winner === "A" ? "B" : "A";

  const personaLabel = (id: string) => PERSONAS.find((p) => p.id === id)?.label ?? id;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pb-16">
      <div className="text-center animate-fade-up">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          {CONTEXT_META[context].label} · Synthetic jury of 100
        </p>
        <h1 className="verdict-font mt-2 text-2xl text-[var(--foreground)]">
          THE JURY HAS DECIDED
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "A", image: imageA, count: countA, isWinner: result.winner === "A" },
          { label: "B", image: imageB, count: countB, isWinner: result.winner === "B" },
        ].map((item) => (
          <div key={item.label} className="relative">
            <div
              className="relative aspect-[3/4] overflow-hidden rounded-2xl border-2 transition-all"
              style={{
                borderColor:
                  stage >= 1 && item.isWinner ? "var(--accent-gold)" : "var(--panel-border)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt={`Image ${item.label}`} className="h-full w-full object-cover" />
              {stage >= 1 && item.isWinner && (
                <span
                  className="verdict-font absolute top-2 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs"
                  style={{ background: "var(--accent-gold)", color: "#08080b" }}
                >
                  WINNER
                </span>
              )}
              {defending && item.label === "A" && (
                <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                  Defending
                </span>
              )}
            </div>
            <div className="mt-2 text-center">
              <span className="verdict-font text-4xl animate-count-pulse" key={item.count}>
                {item.count}
              </span>
              <span className="ml-1 text-sm text-[var(--muted)]">— {item.label}</span>
            </div>
          </div>
        ))}
      </div>

      {stage >= 1 && (
        <div className="animate-fade-up text-center">
          <p className="verdict-font gradient-text text-5xl">
            {result.winner} WINS — {winnerVotes}%
          </p>
        </div>
      )}

      {stage >= 2 && (
        <div className="flex flex-col gap-4">
          <Section title="Why it won" tone="a" delay={0}>
            {result.winReason}
          </Section>
          <Section title={`Why ${loserLabel} lost`} tone="b" delay={80}>
            {result.loseReason}
          </Section>
          <Section title={`One thing ${loserLabel} does better`} tone="neutral" delay={160}>
            {result.loserStrength}
          </Section>

          <div className="animate-fade-up rounded-2xl border p-4" style={{ borderColor: "var(--panel-border)", background: "var(--panel)", animationDelay: "240ms" }}>
            <p className="mb-3 text-xs uppercase tracking-wide text-[var(--muted)]">
              Audience segments
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="mb-1.5 font-semibold text-[var(--foreground)]">
                  Favors {result.winner}
                </p>
                <ul className="space-y-1.5">
                  {segmentsForWinner.map((s) => (
                    <li key={s.persona} className="text-[var(--muted)]">
                      <span className="text-[var(--foreground)]">{personaLabel(s.persona)}</span>
                      <span className="block text-xs">{s.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1.5 font-semibold text-[var(--foreground)]">
                  Favors {loserLabel}
                </p>
                <ul className="space-y-1.5">
                  {segmentsForLoser.map((s) => (
                    <li key={s.persona} className="text-[var(--muted)]">
                      <span className="text-[var(--foreground)]">{personaLabel(s.persona)}</span>
                      <span className="block text-xs">{s.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div
            className="animate-fade-up flex items-center gap-3 rounded-2xl border p-4"
            style={{ borderColor: "var(--panel-border)", background: "var(--panel)", animationDelay: "320ms" }}
          >
            <span
              className="verdict-font rounded-full px-3 py-1 text-xs"
              style={{ background: "rgba(124,92,255,0.18)", color: "var(--accent-b)" }}
            >
              {CONFIDENCE_LABEL[result.confidence]}
            </span>
            <p className="text-sm text-[var(--muted)]">{result.confidenceNote}</p>
          </div>

          <div
            className="animate-fade-up rounded-2xl border p-4"
            style={{ borderColor: "var(--accent-gold)", background: "rgba(255,207,63,0.06)", animationDelay: "400ms" }}
          >
            <p className="mb-1 text-xs uppercase tracking-wide" style={{ color: "var(--accent-gold)" }}>
              Improve your odds
            </p>
            <p className="text-sm text-[var(--foreground)]">{result.improvementTip}</p>
          </div>

          <p className="animate-fade-up text-center text-[11px] leading-relaxed text-[var(--muted)]" style={{ animationDelay: "480ms" }}>
            This is an AI simulation of likely perception, not a scientific measurement or a
            judgement of who you are. It never infers protected or sensitive personal attributes,
            and offers no medical or cosmetic-surgery advice.
          </p>

          <div className="animate-fade-up" style={{ animationDelay: "560ms" }}>
            <ShareActions
              result={result}
              imageA={imageA}
              imageB={imageB}
              winnerImage={winnerImage}
              context={context}
              onRunAnother={onRunAnother}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
  tone,
  delay,
}: {
  title: string;
  children: string;
  tone: "a" | "b" | "neutral";
  delay: number;
}) {
  const color =
    tone === "a" ? "var(--accent-gold)" : tone === "b" ? "var(--accent-a)" : "var(--muted)";
  return (
    <div
      className="animate-fade-up rounded-2xl border p-4"
      style={{ borderColor: "var(--panel-border)", background: "var(--panel)", animationDelay: `${delay}ms` }}
    >
      <p className="mb-1 text-xs uppercase tracking-wide" style={{ color }}>
        {title}
      </p>
      <p className="text-sm text-[var(--foreground)]">{children}</p>
    </div>
  );
}
