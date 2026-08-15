"use client";

import { useEffect, useState } from "react";
import { ImageSlot } from "@/components/ImageSlot";
import { generatePlaceholderImage } from "@/lib/promo/placeholderImage";
import { generatePromoCard, type CardFormat } from "@/lib/promo/promoCard";
import { renderShortVideo } from "@/lib/promo/renderShort";
import { PROMO_SCENARIOS, resolveSiteUrl } from "@/lib/promo/scenarios";
import { ContentLibrary } from "./ContentLibrary";

const SITE_URL_KEY = "jury_promo_site_url";

type AssetState = { url: string; blob: Blob } | null;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function PromoStudio() {
  const [siteUrl, setSiteUrl] = useState("");
  const [scenarioId, setScenarioId] = useState(PROMO_SCENARIOS[0].id);
  const [imageA, setImageA] = useState<string | null>(null);
  const [imageB, setImageB] = useState<string | null>(null);
  const [usingPlaceholders, setUsingPlaceholders] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [storyAsset, setStoryAsset] = useState<AssetState>(null);
  const [squareAsset, setSquareAsset] = useState<AssetState>(null);
  const [xAsset, setXAsset] = useState<AssetState>(null);
  const [videoAsset, setVideoAsset] = useState<{ url: string; blob: Blob; extension: string } | null>(null);

  const scenario = PROMO_SCENARIOS.find((s) => s.id === scenarioId) ?? PROMO_SCENARIOS[0];

  useEffect(() => {
    queueMicrotask(() => {
      const saved = window.localStorage.getItem(SITE_URL_KEY);
      if (saved) setSiteUrl(saved);
      setImageA(generatePlaceholderImage("A"));
      setImageB(generatePlaceholderImage("B"));
    });
  }, []);

  useEffect(() => {
    if (siteUrl) window.localStorage.setItem(SITE_URL_KEY, siteUrl);
  }, [siteUrl]);

  function handleUploadA(dataUrl: string) {
    setImageA(dataUrl);
    setUsingPlaceholders(false);
  }
  function handleUploadB(dataUrl: string) {
    setImageB(dataUrl);
    setUsingPlaceholders(false);
  }
  function resetToPlaceholders() {
    setImageA(generatePlaceholderImage("A"));
    setImageB(generatePlaceholderImage("B"));
    setUsingPlaceholders(true);
  }

  async function handleGenerate() {
    if (!imageA || !imageB) return;
    setGenerating(true);
    setVideoProgress(0);
    setStatus("Rendering images…");
    // Clean up previous object URLs before replacing them.
    [storyAsset, squareAsset, xAsset, videoAsset].forEach((a) => a && URL.revokeObjectURL(a.url));

    try {
      const cardOpts = (format: CardFormat) => ({
        format,
        imageA,
        imageB,
        category: scenario.category,
        headline: scenario.headline,
        votesA: scenario.demo.votesA,
        votesB: scenario.demo.votesB,
        cta: scenario.cta,
        siteLabel: siteUrl || "your JURY link",
      });

      const [storyBlob, squareBlob, xBlob] = await Promise.all([
        generatePromoCard(cardOpts("story")),
        generatePromoCard(cardOpts("square")),
        generatePromoCard(cardOpts("x")),
      ]);
      setStoryAsset({ blob: storyBlob, url: URL.createObjectURL(storyBlob) });
      setSquareAsset({ blob: squareBlob, url: URL.createObjectURL(squareBlob) });
      setXAsset({ blob: xBlob, url: URL.createObjectURL(xBlob) });

      setStatus("Recording short video (~12s, don't switch tabs)…");
      const { blob: videoBlob, extension } = await renderShortVideo({
        imageA,
        imageB,
        headline: scenario.headline,
        votesA: scenario.demo.votesA,
        votesB: scenario.demo.votesB,
        cta: scenario.cta,
        siteLabel: siteUrl || "your JURY link",
        onProgress: setVideoProgress,
      });
      setVideoAsset({ blob: videoBlob, url: URL.createObjectURL(videoBlob), extension });
      setStatus("Done — download and post below.");
    } catch {
      setStatus("Something went wrong generating assets. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy(key: string, text: string) {
    const ok = await copyText(resolveSiteUrl(text, siteUrl || "your JURY link"));
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1800);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <p className="verdict-font gradient-text text-xs tracking-[0.3em]">JURY · PROMO STUDIO</p>
        <h1 className="verdict-font mt-2 text-2xl text-[var(--foreground)]">Generate. Download. Post.</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Private tool — not linked anywhere public.</p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-[var(--muted)]">
          Your JURY link
        </label>
        <input
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
          placeholder="your-app.vercel.app"
          className="w-full rounded-xl border px-3 py-2.5 text-sm text-[var(--foreground)] outline-none"
          style={{ borderColor: "var(--panel-border)", background: "var(--panel)" }}
        />
        <p className="mt-1 text-xs text-[var(--muted)]">
          Saved on this device. Used in every generated post/card/video.
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-[var(--muted)]">1. Pick a scenario</p>
        <div className="grid grid-cols-2 gap-2">
          {PROMO_SCENARIOS.map((s) => {
            const active = s.id === scenarioId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setScenarioId(s.id)}
                className="rounded-xl border px-3 py-2.5 text-left text-xs transition-colors"
                style={{
                  borderColor: active ? "var(--accent-b)" : "var(--panel-border)",
                  background: active
                    ? "linear-gradient(120deg, rgba(255,59,92,0.18), rgba(124,92,255,0.18))"
                    : "var(--panel)",
                }}
              >
                <span className="block font-semibold text-[var(--foreground)]">{s.label}</span>
                <span className="mt-0.5 block text-[var(--muted)]">{s.question}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">2. Photos (optional)</p>
          {!usingPlaceholders && (
            <button type="button" onClick={resetToPlaceholders} className="text-xs text-[var(--accent-b)]">
              Use samples
            </button>
          )}
        </div>
        {usingPlaceholders && (
          <p className="mb-2 text-xs text-[var(--muted)]">
            Using abstract sample images. Upload your own two photos for anything you actually plan to post.
          </p>
        )}
        <div className="flex gap-3">
          <ImageSlot label="A" accent="a" image={imageA} onChange={handleUploadA} />
          <ImageSlot label="B" accent="b" image={imageB} onChange={handleUploadB} />
        </div>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating || !imageA || !imageB}
        className="verdict-font w-full rounded-full py-4 text-lg tracking-wide text-black transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: "linear-gradient(100deg, var(--accent-a), var(--accent-b))" }}
      >
        {generating ? "GENERATING…" : "GENERATE PROMO"}
      </button>

      {generating && (
        <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--panel-border)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.round(videoProgress * 100)}%`,
              background: "linear-gradient(90deg, var(--accent-a), var(--accent-b))",
            }}
          />
        </div>
      )}
      {status && <p className="text-center text-xs text-[var(--muted)]">{status}</p>}

      {(storyAsset || squareAsset || xAsset || videoAsset) && (
        <div className="flex flex-col gap-2.5">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">3. Download</p>
          {videoAsset && (
            <button
              type="button"
              onClick={() => downloadBlob(videoAsset.blob, `jury-${scenario.id}-short.${videoAsset.extension}`)}
              className="w-full rounded-full border py-3 text-sm font-semibold text-[var(--foreground)]"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel)" }}
            >
              DOWNLOAD SHORT ({videoAsset.extension.toUpperCase()})
            </button>
          )}
          {storyAsset && (
            <button
              type="button"
              onClick={() => downloadBlob(storyAsset.blob, `jury-${scenario.id}-story.png`)}
              className="w-full rounded-full border py-3 text-sm font-semibold text-[var(--foreground)]"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel)" }}
            >
              DOWNLOAD STORY IMAGE
            </button>
          )}
          {squareAsset && (
            <button
              type="button"
              onClick={() => downloadBlob(squareAsset.blob, `jury-${scenario.id}-square.png`)}
              className="w-full rounded-full border py-3 text-sm font-semibold text-[var(--foreground)]"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel)" }}
            >
              DOWNLOAD SQUARE IMAGE
            </button>
          )}
          {xAsset && (
            <button
              type="button"
              onClick={() => downloadBlob(xAsset.blob, `jury-${scenario.id}-x.png`)}
              className="w-full rounded-full border py-3 text-sm font-semibold text-[var(--foreground)]"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel)" }}
            >
              DOWNLOAD X IMAGE
            </button>
          )}

          <p className="mt-2 text-xs uppercase tracking-wide text-[var(--muted)]">4. Copy this scenario&apos;s copy</p>
          {[
            { key: "x", label: "COPY X POST", text: scenario.xPost },
            { key: "yt-title", label: "COPY YOUTUBE TITLE", text: scenario.youtubeTitle },
            { key: "yt-desc", label: "COPY YOUTUBE DESCRIPTION", text: scenario.youtubeDescription },
          ].map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => handleCopy(btn.key, btn.text)}
              className="w-full rounded-full border py-3 text-sm font-semibold text-[var(--foreground)]"
              style={{ borderColor: "var(--panel-border)", background: "var(--panel)" }}
            >
              {copiedKey === btn.key ? "COPIED!" : btn.label}
            </button>
          ))}
        </div>
      )}

      <ContentLibrary siteUrl={siteUrl} />
    </div>
  );
}
