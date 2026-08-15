"use client";

import { useState } from "react";
import { X_POSTS, resolveXPostUrl } from "@/lib/promo/xPosts";
import { YOUTUBE_SHORTS, resolveShortUrl } from "@/lib/promo/youtubeShorts";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ContentLibrary({ siteUrl }: { siteUrl: string }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const effectiveUrl = siteUrl || "your JURY link";

  async function handleCopy(key: string, text: string) {
    const ok = await copyText(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1800);
    }
  }

  return (
    <div className="flex flex-col gap-6 border-t pt-6" style={{ borderColor: "var(--panel-border)" }}>
      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-[var(--muted)]">
          X post library ({X_POSTS.length})
        </p>
        <div className="flex flex-col gap-2">
          {X_POSTS.map((post) => {
            const resolved = resolveXPostUrl(post.text, effectiveUrl);
            const key = `xpost-${post.id}`;
            return (
              <div
                key={post.id}
                className="rounded-xl border p-3"
                style={{ borderColor: "var(--panel-border)", background: "var(--panel)" }}
              >
                <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--accent-b)]">{post.tone}</p>
                <p className="mb-2 text-sm text-[var(--foreground)]">{resolved}</p>
                <button
                  type="button"
                  onClick={() => handleCopy(key, resolved)}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]"
                  style={{ borderColor: "var(--panel-border)" }}
                >
                  {copiedKey === key ? "Copied!" : "Copy post"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-[var(--muted)]">
          YouTube Shorts concepts ({YOUTUBE_SHORTS.length})
        </p>
        <div className="flex flex-col gap-2">
          {YOUTUBE_SHORTS.map((sh) => {
            const titleKey = `yt-title-${sh.id}`;
            const descKey = `yt-desc-${sh.id}`;
            const description = resolveShortUrl(sh.description, effectiveUrl);
            return (
              <details
                key={sh.id}
                className="rounded-xl border p-3"
                style={{ borderColor: "var(--panel-border)", background: "var(--panel)" }}
              >
                <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
                  {sh.title}
                </summary>
                <div className="mt-3 flex flex-col gap-2 text-xs text-[var(--muted)]">
                  <p className="italic text-[var(--foreground)]">&quot;{sh.hook}&quot;</p>

                  <div>
                    <p className="mb-1 text-[10px] uppercase tracking-wide">Shot-by-shot</p>
                    <ul className="space-y-1">
                      {sh.timing.map((t) => (
                        <li key={t.time}>
                          <span className="text-[var(--foreground)]">{t.time}</span> — {t.beat}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="mb-1 text-[10px] uppercase tracking-wide">On-screen text</p>
                    <p>{sh.onScreenText.join("  →  ")}</p>
                  </div>

                  <div>
                    <p className="mb-1 text-[10px] uppercase tracking-wide">CTA</p>
                    <p>{sh.cta}</p>
                  </div>

                  <div>
                    <p className="mb-1 text-[10px] uppercase tracking-wide">Hashtags</p>
                    <p>{sh.hashtags.join(" ")}</p>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(titleKey, sh.title)}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]"
                      style={{ borderColor: "var(--panel-border)" }}
                    >
                      {copiedKey === titleKey ? "Copied!" : "Copy title"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(descKey, description)}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]"
                      style={{ borderColor: "var(--panel-border)" }}
                    >
                      {copiedKey === descKey ? "Copied!" : "Copy description"}
                    </button>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
