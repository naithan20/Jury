import { CONTEXT_META, type JuryContext, type JuryResult } from "./types";

const W = 1080;
const H = 1920;

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

export async function generateShareCard(
  imageA: string,
  imageB: string,
  result: JuryResult,
  context: JuryContext,
  verdictFont = "Anton, sans-serif",
  bodyFont = "Arial, sans-serif",
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = "#08080b";
  ctx.fillRect(0, 0, W, H);

  const grad = ctx.createRadialGradient(W / 2, -100, 100, W / 2, -100, 1200);
  grad.addColorStop(0, "#1a1220");
  grad.addColorStop(1, "#08080b");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = "#8b8b96";
  ctx.font = `600 30px ${bodyFont}`;
  ctx.fillText("JURY · " + CONTEXT_META[context].label.toUpperCase(), W / 2, 120);

  ctx.fillStyle = "#f5f4f2";
  ctx.font = `400 64px ${verdictFont}`;
  ctx.fillText("THE JURY HAS DECIDED", W / 2, 210);

  const [imgA, imgB] = await Promise.all([loadImage(imageA), loadImage(imageB)]);

  const imgW = 460;
  const imgH = 610;
  const gap = 40;
  const totalW = imgW * 2 + gap;
  const startX = (W - totalW) / 2;
  const imgY = 280;

  const winnerIsA = result.winner === "A";

  [
    { img: imgA, x: startX, label: "A", isWinner: winnerIsA, votes: result.votesA },
    { img: imgB, x: startX + imgW + gap, label: "B", isWinner: !winnerIsA, votes: result.votesB },
  ].forEach(({ img, x, label, isWinner, votes }) => {
    ctx.save();
    roundedRect(ctx, x, imgY, imgW, imgH, 28);
    ctx.clip();
    drawCover(ctx, img, x, imgY, imgW, imgH);
    ctx.restore();

    roundedRect(ctx, x, imgY, imgW, imgH, 28);
    ctx.lineWidth = isWinner ? 8 : 2;
    ctx.strokeStyle = isWinner ? "#ffcf3f" : "rgba(255,255,255,0.15)";
    ctx.stroke();

    if (isWinner) {
      ctx.fillStyle = "#ffcf3f";
      ctx.font = `400 34px ${verdictFont}`;
      ctx.textAlign = "center";
      ctx.save();
      ctx.translate(x + imgW / 2, imgY - 22);
      ctx.fillText("WINNER", 0, 0);
      ctx.restore();
    }

    ctx.fillStyle = "#000000aa";
    roundedRect(ctx, x + imgW / 2 - 60, imgY + imgH - 70, 120, 50, 25);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 30px ${bodyFont}`;
    ctx.textAlign = "center";
    ctx.fillText(`${label} · ${votes}`, x + imgW / 2, imgY + imgH - 35);
  });

  const winnerVotes = winnerIsA ? result.votesA : result.votesB;
  ctx.fillStyle = "#f5f4f2";
  ctx.font = `400 130px ${verdictFont}`;
  ctx.textAlign = "center";
  const winnerLabel = `${result.winner} WINS`;
  const gradText = ctx.createLinearGradient(W / 2 - 300, 0, W / 2 + 300, 0);
  gradText.addColorStop(0, "#ff3b5c");
  gradText.addColorStop(1, "#7c5cff");
  ctx.fillStyle = gradText;
  ctx.fillText(winnerLabel, W / 2, 1140);

  ctx.fillStyle = "#f5f4f2";
  ctx.font = `400 90px ${verdictFont}`;
  ctx.fillText(`${winnerVotes}%`, W / 2, 1250);

  ctx.font = `600 32px ${bodyFont}`;
  ctx.fillStyle = "#c9c9d1";
  wrapText(ctx, result.winReason, W / 2, 1330, 860, 42, 3);

  ctx.strokeStyle = "#232329";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(140, 1560);
  ctx.lineTo(W - 140, 1560);
  ctx.stroke();

  ctx.fillStyle = "#f5f4f2";
  ctx.font = `400 46px ${verdictFont}`;
  ctx.fillText("JURY", W / 2, 1660);

  ctx.fillStyle = "#8b8b96";
  ctx.font = `500 28px ${bodyFont}`;
  wrapText(
    ctx,
    "Before real people judge you, let 100 AI people do it first.",
    W / 2,
    1720,
    780,
    36,
    2,
  );

  ctx.fillStyle = "#5c5c66";
  ctx.font = `400 24px ${bodyFont}`;
  ctx.fillText("AI simulation of likely perception — not a scientific measurement.", W / 2, 1840);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to render card"))),
      "image/png",
      0.95,
    );
  });
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
  lines.forEach((l, i) => {
    ctx.fillText(l, x, y + offset + i * lineHeight);
  });
}
