/**
 * Renders a vertical (1080x1920) promo short entirely client-side: draw an
 * animated timeline to a <canvas>, capture it as a MediaStream, and record
 * it with MediaRecorder. No server, no ffmpeg, no paid video API — just the
 * browser's own recording pipeline. Tries native MP4 first (supported on
 * recent Chrome/Android) and falls back to WebM, which is what most
 * browsers actually support today.
 */

export interface ShortVideoOptions {
  imageA: string;
  imageB: string;
  headline: string;
  votesA: number;
  votesB: number;
  cta: string;
  siteLabel: string;
  onProgress?: (fraction: number) => void;
}

export interface ShortVideoResult {
  blob: Blob;
  mimeType: string;
  extension: "mp4" | "webm";
}

const W = 1080;
const H = 1920;
const DURATION_MS = 12000;
const FPS = 30;

const CANDIDATE_MIME_TYPES: { mimeType: string; extension: "mp4" | "webm" }[] = [
  { mimeType: "video/mp4;codecs=avc1.42E01E", extension: "mp4" },
  { mimeType: "video/mp4", extension: "mp4" },
  { mimeType: "video/webm;codecs=vp9", extension: "webm" },
  { mimeType: "video/webm;codecs=vp8", extension: "webm" },
  { mimeType: "video/webm", extension: "webm" },
];

function pickMimeType(): { mimeType: string; extension: "mp4" | "webm" } {
  for (const candidate of CANDIDATE_MIME_TYPES) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }
  return { mimeType: "", extension: "webm" };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
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

const VERDICT_FONT = "Anton, sans-serif";
const BODY_FONT = "Arial, sans-serif";

export async function renderShortVideo(opts: ShortVideoOptions): Promise<ShortVideoResult> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const [imgA, imgB] = await Promise.all([loadImage(opts.imageA), loadImage(opts.imageB)]);
  const winnerIsA = opts.votesB <= opts.votesA;
  const winnerLabel = winnerIsA ? "A" : "B";
  const winnerVotes = winnerIsA ? opts.votesA : opts.votesB;

  const stream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(
    FPS,
  );
  const { mimeType, extension } = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  function drawBackground() {
    ctx!.fillStyle = "#08080b";
    ctx!.fillRect(0, 0, W, H);
    const grad = ctx!.createRadialGradient(W / 2, -200, 200, W / 2, -200, 1600);
    grad.addColorStop(0, "#1a1220");
    grad.addColorStop(1, "#08080b");
    ctx!.fillStyle = grad;
    ctx!.fillRect(0, 0, W, H);
  }

  function drawImagesRow(imgProgress: number, showVotes: boolean, revealWinner: boolean) {
    const gap = 32;
    const imgW = (W * 0.86 - gap) / 2;
    const imgH = imgW * 1.35;
    const startX = (W - (imgW * 2 + gap)) / 2;
    const y = H * 0.28;
    const slide = (1 - easeOutCubic(imgProgress)) * 80;

    [
      { img: imgA, x: startX - slide, label: "A", isWinner: winnerIsA, votes: opts.votesA },
      { img: imgB, x: startX + imgW + gap + slide, label: "B", isWinner: !winnerIsA, votes: opts.votesB },
    ].forEach(({ img, x, label, isWinner, votes }) => {
      ctx!.save();
      ctx!.globalAlpha = easeOutCubic(imgProgress);
      roundedRect(ctx!, x, y, imgW, imgH, 24);
      ctx!.clip();
      drawCover(ctx!, img, x, y, imgW, imgH);
      ctx!.restore();

      ctx!.save();
      ctx!.globalAlpha = easeOutCubic(imgProgress);
      roundedRect(ctx!, x, y, imgW, imgH, 24);
      ctx!.lineWidth = revealWinner && isWinner ? 8 : 2;
      ctx!.strokeStyle = revealWinner && isWinner ? "#ffcf3f" : "rgba(255,255,255,0.18)";
      ctx!.stroke();
      ctx!.restore();

      if (showVotes) {
        ctx!.textAlign = "center";
        ctx!.fillStyle = "#000000aa";
        roundedRect(ctx!, x + imgW / 2 - 70, y + imgH - 60, 140, 44, 22);
        ctx!.fill();
        ctx!.fillStyle = "#fff";
        ctx!.font = `700 26px ${BODY_FONT}`;
        ctx!.fillText(`${label} · ${votes}`, x + imgW / 2, y + imgH - 30);
      }
    });
  }

  function drawFrame(elapsedMs: number) {
    const t = elapsedMs / DURATION_MS;
    drawBackground();
    ctx!.textAlign = "center";

    // Phase boundaries (fractions of total duration)
    const hookEnd = 0.14;
    const vsEnd = 0.35;
    const voteEnd = 0.65;
    const revealEnd = 0.86;

    if (t < hookEnd) {
      const p = easeOutCubic(Math.min(1, t / hookEnd));
      ctx!.globalAlpha = p;
      ctx!.fillStyle = "#f5f4f2";
      ctx!.font = `400 76px ${VERDICT_FONT}`;
      wrapText(ctx!, opts.headline.toUpperCase(), W / 2, H * 0.46, W * 0.86, 82, 3);
      ctx!.globalAlpha = 1;
    } else if (t < vsEnd) {
      const p = (t - hookEnd) / (vsEnd - hookEnd);
      drawImagesRow(p, false, false);
      ctx!.fillStyle = "#8b8b96";
      ctx!.font = `600 34px ${BODY_FONT}`;
      ctx!.fillText("100 SIMULATED AI PERSPECTIVES", W / 2, H * 0.78);
    } else if (t < voteEnd) {
      drawImagesRow(1, false, false);
      const p = (t - vsEnd) / (voteEnd - vsEnd);
      ctx!.fillStyle = "#f5f4f2";
      ctx!.font = `400 46px ${VERDICT_FONT}`;
      ctx!.fillText("THE JURY IS VOTING", W / 2, H * 0.72);
      const dots = ".".repeat(1 + Math.floor(p * 6) % 3);
      ctx!.fillStyle = "#7c5cff";
      ctx!.font = `600 40px ${BODY_FONT}`;
      ctx!.fillText(dots, W / 2, H * 0.78);
    } else if (t < revealEnd) {
      drawImagesRow(1, true, true);
      const p = easeOutCubic((t - voteEnd) / (revealEnd - voteEnd));
      ctx!.globalAlpha = p;
      const gradText = ctx!.createLinearGradient(W / 2 - 260, 0, W / 2 + 260, 0);
      gradText.addColorStop(0, "#ff3b5c");
      gradText.addColorStop(1, "#7c5cff");
      ctx!.fillStyle = gradText;
      ctx!.font = `400 100px ${VERDICT_FONT}`;
      ctx!.fillText(`${winnerLabel} WINS`, W / 2, H * 0.68);
      ctx!.fillStyle = "#f5f4f2";
      ctx!.font = `400 70px ${VERDICT_FONT}`;
      ctx!.fillText(`${winnerVotes}%`, W / 2, H * 0.75);
      ctx!.globalAlpha = 1;
    } else {
      const p = easeOutCubic((t - revealEnd) / (1 - revealEnd));
      ctx!.globalAlpha = p;
      ctx!.fillStyle = "#ffcf3f";
      ctx!.font = `400 52px ${VERDICT_FONT}`;
      ctx!.fillText("THINK THE JURY IS WRONG?", W / 2, H * 0.42);
      ctx!.fillStyle = "#f5f4f2";
      ctx!.font = `400 40px ${VERDICT_FONT}`;
      wrapText(ctx!, opts.cta.toUpperCase(), W / 2, H * 0.53, W * 0.82, 46, 2);
      ctx!.fillStyle = "#f5f4f2";
      ctx!.font = `400 60px ${VERDICT_FONT}`;
      ctx!.fillText("JURY", W / 2, H * 0.68);
      ctx!.fillStyle = "#8b8b96";
      ctx!.font = `500 34px ${BODY_FONT}`;
      ctx!.fillText(opts.siteLabel, W / 2, H * 0.74);
      ctx!.globalAlpha = 1;
    }
  }

  return new Promise((resolve, reject) => {
    recorder.start(200);
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      drawFrame(Math.min(elapsed, DURATION_MS));
      opts.onProgress?.(Math.min(1, elapsed / DURATION_MS));
      if (elapsed < DURATION_MS) {
        requestAnimationFrame(tick);
      } else {
        recorder.stop();
      }
    }
    requestAnimationFrame(tick);

    stopped
      .then(() => {
        const blob = new Blob(chunks, { type: mimeType || "video/webm" });
        resolve({ blob, mimeType: mimeType || "video/webm", extension });
      })
      .catch(reject);
  });
}
