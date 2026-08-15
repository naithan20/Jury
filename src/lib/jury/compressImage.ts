/**
 * Downscale + re-encode an image file client-side before it ever leaves the
 * browser. Keeps API payloads small (cheaper/faster model calls) and keeps
 * challenge-link images small enough to fit in a URL fragment.
 */
export async function compressImage(
  file: File,
  { maxDimension = 1024, quality = 0.82 }: { maxDimension?: number; quality?: number } = {},
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}

export async function recompressDataUrl(
  dataUrl: string,
  maxDimension: number,
  quality: number,
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });

  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}

export async function compressImageToMaxBytes(
  file: File,
  maxBytes: number,
): Promise<string> {
  let dimension = 1024;
  let quality = 0.82;

  for (let attempt = 0; attempt < 6; attempt++) {
    const dataUrl = await compressImage(file, { maxDimension: dimension, quality });
    const approxBytes = (dataUrl.length * 3) / 4;
    if (approxBytes <= maxBytes) return dataUrl;
    quality -= 0.15;
    if (quality < 0.4) {
      quality = 0.6;
      dimension = Math.round(dimension * 0.75);
    }
  }

  return compressImage(file, { maxDimension: 480, quality: 0.5 });
}
