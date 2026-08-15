import { CONTEXT_META, type JuryContext } from "@/lib/jury/types";

export type CardFormat = "story" | "square" | "x";

interface LayoutSpec {
  w: number;
  h: number;
  labelFont: number;
  labelY: number;
  headlineFont: number;
  headlineLineHeight: number;
  headlineY: number;
  headlineMaxLines: number;
  imgY: number;
  imgH: number; // 0 < imgH <= 1 means "ratio of imgW"; otherwise absolute px
  imgHIsRatio: boolean;
  winnerBadgeFont: number;
  winnerGapAboveImg: number;
  votesBadgeFont: number;
  winnerY: number;
  winnerFont: number;
  disclaimerY: number;
  disclaimerFont: number;
  disclaimerLineHeight: number;
  dividerY: number | null;
  ctaY: number;
  ctaFont: number;
  ctaMaxLines: number;
  footerCombined: boolean; // true for the compact X format
  wordmarkY: number;
  wordmarkFont: number;
  siteY: number;
  siteFont: number;
}

// Absolute pixel layout, hand-tuned per format so nothing ever overlaps or
// clips — deliberately not derived from a single shared scale factor, since
// story/square/x have very different aspect ratios and a uniform multiplier
// either left story half-empty or overflowed square/x.
const LAYOUTS: Record<CardFormat, LayoutSpec> = {
  story: {
    w: 1080,
    h: 1920,
    labelFont: 28,
    labelY: 110,
    headlineFont: 58,
    headlineLineHeight: 64,
    headlineY: 225,
    headlineMaxLines: 2,
    imgY: 340,
    imgH: 1.62,
    imgHIsRatio: true,
    winnerBadgeFont: 26,
    winnerGapAboveImg: 14,
    votesBadgeFont: 24,
    winnerY: 1199,
    winnerFont: 78,
    disclaimerY: 1309,
    disclaimerFont: 26,
    disclaimerLineHeight: 34,
    dividerY: 1399,
    ctaY: 1479,
    ctaFont: 32,
    ctaMaxLines: 2,
    footerCombined: false,
    wordmarkY: 1569,
    wordmarkFont: 36,
    siteY: 1614,
    siteFont: 24,
  },
  square: {
    w: 1080,
    h: 1080,
    labelFont: 26,
    labelY: 45,
    headlineFont: 44,
    headlineLineHeight: 48,
    headlineY: 108,
    headlineMaxLines: 2,
    imgY: 205,
    imgH: 1.0,
    imgHIsRatio: true,
    winnerBadgeFont: 22,
    winnerGapAboveImg: 12,
    votesBadgeFont: 20,
    winnerY: 740,
    winnerFont: 56,
    disclaimerY: 808,
    disclaimerFont: 21,
    disclaimerLineHeight: 27,
    dividerY: 864,
    ctaY: 918,
    ctaFont: 26,
    ctaMaxLines: 1,
    footerCombined: false,
    wordmarkY: 972,
    wordmarkFont: 30,
    siteY: 1012,
    siteFont: 20,
  },
  x: {
    w: 1200,
    h: 675,
    labelFont: 22,
    labelY: 50,
    headlineFont: 36,
    headlineLineHeight: 40,
    headlineY: 98,
    headlineMaxLines: 1,
    imgY: 132,
    imgH: 280,
    imgHIsRatio: false,
    winnerBadgeFont: 18,
    winnerGapAboveImg: 10,
    votesBadgeFont: 18,
    winnerY: 490,
    winnerFont: 44,
    disclaimerY: 540,
    disclaimerFont: 18,
    disclaimerLineHeight: 22,
    dividerY: null,
    ctaY: 585,
    ctaFont: 24,
    ctaMaxLines: 1,
    footerCombined: true,
    wordmarkY: 630,
    wordmarkFont: 22,
    siteY: 0,
    siteFont: 18,
  },
};

export interface PromoCardOptions {
  format: CardFormat;
  imageA: string;
  imageB: string;
  category: JuryContext;
  headline: string;
  votesA: number;
  votesB: number;
  cta: string;
  siteLabel: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(" ");
  let line = "";
  let lines: string[] = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
  }
  const offset = -((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, y + offset + i * lineHeight));
}

export async function generatePromoCard(opts: PromoCardOptions): Promise<Blob> {
  const spec = LAYOUTS[opts.format];
  const { w: W, h: H } = spec;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const verdictFont = "Anton, sans-serif";
  const bodyFont = "Arial, sans-serif";

  ctx.fillStyle = "#08080b";
  ctx.fillRect(0, 0, W, H);
  const grad = ctx.createRadialGradient(W / 2, -H * 0.1, H * 0.1, W / 2, -H * 0.1, H * 1.1);
  grad.addColorStop(0, "#1a1220");
  grad.addColorStop(1, "#08080b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = "#8b8b96";
  ctx.font = `600 ${spec.labelFont}px ${bodyFont}`;
  ctx.fillText("JURY · " + CONTEXT_META[opts.category].label.toUpperCase(), W / 2, spec.labelY);

  ctx.fillStyle = "#f5f4f2";
  ctx.font = `400 ${spec.headlineFont}px ${verdictFont}`;
  wrapText(
    ctx,
    opts.headline.toUpperCase(),
    W / 2,
    spec.headlineY,
    W * 0.86,
    spec.headlineLineHeight,
    spec.headlineMaxLines,
  );

  const [imgA, imgB] = await Promise.all([loadImage(opts.imageA), loadImage(opts.imageB)]);
  const winnerIsA = opts.votesB <= opts.votesA;

  const gap = 28;
  const imgAreaW = W * 0.86;
  const imgW = (imgAreaW - gap) / 2;
  const imgH = spec.imgHIsRatio ? imgW * spec.imgH : spec.imgH;
  const startX = (W - (imgW * 2 + gap)) / 2;
  const imgY = spec.imgY;

  [
    { img: imgA, x: startX, label: "A", isWinner: winnerIsA, votes: opts.votesA },
    { img: imgB, x: startX + imgW + gap, label: "B", isWinner: !winnerIsA, votes: opts.votesB },
  ].forEach(({ img, x, label, isWinner, votes }) => {
    ctx.save();
    roundedRect(ctx, x, imgY, imgW, imgH, 22);
    ctx.clip();
    drawCover(ctx, img, x, imgY, imgW, imgH);
    ctx.restore();

    roundedRect(ctx, x, imgY, imgW, imgH, 22);
    ctx.lineWidth = isWinner ? 7 : 2;
    ctx.strokeStyle = isWinner ? "#ffcf3f" : "rgba(255,255,255,0.15)";
    ctx.stroke();

    if (isWinner) {
      ctx.fillStyle = "#ffcf3f";
      ctx.font = `400 ${spec.winnerBadgeFont}px ${verdictFont}`;
      ctx.fillText("WINNER", x + imgW / 2, imgY - spec.winnerGapAboveImg);
    }

    ctx.fillStyle = "#000000aa";
    const badgeW = spec.votesBadgeFont * 4;
    const badgeH = spec.votesBadgeFont * 1.7;
    roundedRect(ctx, x + imgW / 2 - badgeW / 2, imgY + imgH - badgeH - 16, badgeW, badgeH, badgeH / 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${spec.votesBadgeFont}px ${bodyFont}`;
    ctx.fillText(`${label} · ${votes}`, x + imgW / 2, imgY + imgH - badgeH / 2 - 16 + spec.votesBadgeFont * 0.35);
  });

  const winner = winnerIsA ? "A" : "B";
  const winnerVotes = winnerIsA ? opts.votesA : opts.votesB;
  const gradText = ctx.createLinearGradient(W / 2 - 220, 0, W / 2 + 220, 0);
  gradText.addColorStop(0, "#ff3b5c");
  gradText.addColorStop(1, "#7c5cff");
  ctx.fillStyle = gradText;
  ctx.font = `400 ${spec.winnerFont}px ${verdictFont}`;
  ctx.fillText(`${winner} WINS — ${winnerVotes}%`, W / 2, spec.winnerY);

  ctx.fillStyle = "#c9c9d1";
  ctx.font = `600 ${spec.disclaimerFont}px ${bodyFont}`;
  wrapText(
    ctx,
    "100 simulated AI perspectives — an AI simulation of likely perception.",
    W / 2,
    spec.disclaimerY,
    W * 0.8,
    spec.disclaimerLineHeight,
    2,
  );

  if (spec.dividerY !== null) {
    ctx.strokeStyle = "#232329";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W * 0.14, spec.dividerY);
    ctx.lineTo(W * 0.86, spec.dividerY);
    ctx.stroke();
  }

  ctx.fillStyle = "#ffcf3f";
  ctx.font = `400 ${spec.ctaFont}px ${verdictFont}`;
  wrapText(ctx, opts.cta.toUpperCase(), W / 2, spec.ctaY, W * 0.8, spec.ctaFont * 1.25, spec.ctaMaxLines);

  if (spec.footerCombined) {
    ctx.fillStyle = "#f5f4f2";
    ctx.font = `400 ${spec.wordmarkFont}px ${verdictFont}`;
    ctx.fillText("JURY", W / 2, spec.wordmarkY);
    ctx.fillStyle = "#8b8b96";
    ctx.font = `500 ${spec.siteFont}px ${bodyFont}`;
    ctx.fillText(opts.siteLabel, W / 2, spec.wordmarkY + spec.siteFont + 8);
  } else {
    ctx.fillStyle = "#f5f4f2";
    ctx.font = `400 ${spec.wordmarkFont}px ${verdictFont}`;
    ctx.fillText("JURY", W / 2, spec.wordmarkY);
    ctx.fillStyle = "#8b8b96";
    ctx.font = `500 ${spec.siteFont}px ${bodyFont}`;
    ctx.fillText(opts.siteLabel, W / 2, spec.siteY);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to render card"))),
      "image/png",
      0.95,
    );
  });
}
