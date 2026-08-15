/**
 * Procedurally-drawn abstract placeholder "photos" for the promo generator,
 * so /promo works with zero uploads. Pure canvas shapes — no photographs,
 * no stock imagery, no celebrity likenesses, so there's no licensing risk.
 * Real users should still upload their own two images for anything they
 * actually intend to publish.
 */

interface PlaceholderSpec {
  bg: [string, string];
  accent: string;
  label: string;
}

const SPECS: Record<"A" | "B", PlaceholderSpec> = {
  A: { bg: ["#1a1220", "#08080b"], accent: "#ff3b5c", label: "SAMPLE A" },
  B: { bg: ["#12182a", "#08080b"], accent: "#7c5cff", label: "SAMPLE B" },
};

export function generatePlaceholderImage(which: "A" | "B", width = 900, height = 1200): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const spec = SPECS[which];

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, spec.bg[0]);
  bg.addColorStop(1, spec.bg[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Abstract "head + shoulders" silhouette — deliberately geometric/generic.
  const cx = width / 2;
  ctx.fillStyle = spec.accent + "33";
  ctx.beginPath();
  ctx.ellipse(cx, height * 0.42, width * 0.24, width * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = spec.accent + "22";
  ctx.beginPath();
  ctx.ellipse(cx, height * 0.98, width * 0.42, height * 0.28, 0, Math.PI, 0, false);
  ctx.fill();

  ctx.strokeStyle = spec.accent + "55";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(cx, height * 0.42, width * 0.24, width * 0.24, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff55";
  ctx.font = "600 28px system-ui, sans-serif";
  ctx.fillText(spec.label, cx, height - 40);

  return canvas.toDataURL("image/jpeg", 0.9);
}
