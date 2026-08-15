"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { JuryFlow } from "@/components/JuryFlow";
import { decodeChallenge, type ChallengePayload } from "@/lib/jury/challenge";

export default function ChallengePage() {
  const [payload, setPayload] = useState<ChallengePayload | "invalid" | "loading">("loading");

  useEffect(() => {
    queueMicrotask(() => {
      const fragment = window.location.hash.slice(1);
      if (!fragment) {
        setPayload("invalid");
        return;
      }
      const decoded = decodeChallenge(fragment);
      setPayload(decoded ?? "invalid");
    });
  }, []);

  if (payload === "loading") {
    return <main className="flex-1" />;
  }

  if (payload === "invalid") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="verdict-font text-2xl">Broken challenge link</p>
        <p className="text-sm text-[var(--muted)]">
          This link is missing or damaged. Start a fresh jury instead.
        </p>
        <Link
          href="/"
          className="verdict-font mt-2 rounded-full px-6 py-3 text-sm text-black"
          style={{ background: "linear-gradient(100deg, var(--accent-a), var(--accent-b))" }}
        >
          GO TO JURY
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 pt-10 pb-6 sm:pt-16">
      <JuryFlow
        lockedImage={{ image: payload.image, label: payload.label }}
        lockedContext={payload.context}
        hero={
          <div className="mx-auto mb-4 max-w-md text-center animate-fade-up">
            <p className="verdict-font gradient-text text-xs tracking-[0.3em]">JURY · CHALLENGE</p>
            <h1 className="verdict-font mt-3 text-3xl leading-tight text-[var(--foreground)] sm:text-4xl">
              Think you can beat this?
            </h1>
            <p className="mt-4 text-sm text-[var(--muted)]">
              Upload your photo to face the defending champion in front of the same 100 AI jurors.
            </p>
          </div>
        }
      />
    </main>
  );
}
