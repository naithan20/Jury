"use client";

import { useState } from "react";
import type { JuryContext, JuryResult } from "@/lib/jury/types";

interface ShareActionsProps {
  result: JuryResult;
  imageA: string;
  imageB: string;
  winnerImage: string;
  context: JuryContext;
  onRunAnother: () => void;
}

export function ShareActions({
  result,
  imageA,
  imageB,
  winnerImage,
  context,
  onRunAnother,
}: ShareActionsProps) {
  const [busy, setBusy] = useState(false);
  const [challengeLink, setChallengeLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    setBusy(true);
    setError(null);
    try {
      const { generateShareCard } = await import("@/lib/jury/shareCard");
      const blob = await generateShareCard(imageA, imageB, result, context);
      const file = new File([blob], "jury-result.png", { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "JURY verdict",
          text: `${result.winner} WINS — ${result.winner === "A" ? result.votesA : result.votesB}%. Before real people judge you, let 100 AI people do it first.`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "jury-result.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setError("Couldn't generate the share card. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleChallenge() {
    setBusy(true);
    setError(null);
    try {
      const { recompressDataUrl } = await import("@/lib/jury/compressImage");
      const { encodeChallenge } = await import("@/lib/jury/challenge");
      const small = await recompressDataUrl(winnerImage, 480, 0.55);
      const fragment = encodeChallenge({ context, image: small, label: result.winner });
      const url = `${window.location.origin}/challenge#${fragment}`;
      setChallengeLink(url);

      if (navigator.share) {
        await navigator.share({
          title: "Think you can beat this?",
          text: "Someone just got judged by 100 AI jurors. Think your photo can beat theirs?",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setError("Couldn't build a challenge link. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={handleShare}
        disabled={busy}
        className="verdict-font w-full rounded-full py-3.5 text-base tracking-wide text-black transition-transform active:scale-[0.98] disabled:opacity-60"
        style={{ background: "linear-gradient(100deg, var(--accent-a), var(--accent-b))" }}
      >
        SHARE RESULT
      </button>

      <button
        type="button"
        onClick={handleChallenge}
        disabled={busy}
        className="w-full rounded-full border py-3 text-sm font-semibold transition-colors active:scale-[0.98] disabled:opacity-60"
        style={{ borderColor: "var(--panel-border)", color: "var(--foreground)" }}
      >
        Challenge Someone
      </button>

      <button
        type="button"
        onClick={onRunAnother}
        className="w-full rounded-full py-3 text-sm font-semibold text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        Run Another
      </button>

      {challengeLink && (
        <div className="mt-1 rounded-xl border p-3 text-xs" style={{ borderColor: "var(--panel-border)", background: "var(--panel)" }}>
          <p className="mb-1 text-[var(--muted)]">
            {copied ? "Link copied to clipboard!" : "Share this link — the winner defends its title:"}
          </p>
          <p className="break-all text-[var(--foreground)]">{challengeLink}</p>
        </div>
      )}

      {error && <p className="text-center text-xs text-[var(--accent-a)]">{error}</p>}
    </div>
  );
}
