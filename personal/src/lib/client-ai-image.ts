/** Compresse une photo pour l’API (limite Vercel ~4,5 Mo). */

const MAX_SIDE = 1280;
const TARGET_MAX_CHARS = 2_800_000;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de charger l’image"));
    img.src = src;
  });
}

function drawToCanvas(img: HTMLImageElement, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height, 1));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return c;
}

function exportJpeg(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Priorité : canvas studio (déjà 1080px), sinon image d’origine compressée.
 */
export async function buildAiImageDataUrl(opts: {
  canvas: HTMLCanvasElement | null;
  originalSrc: string;
}): Promise<string> {
  const tryCanvas = opts.canvas && opts.canvas.width > 0 && opts.canvas.height > 0;
  if (tryCanvas) {
    let q = 0.86;
    for (let i = 0; i < 6; i++) {
      const url = exportJpeg(opts.canvas!, q);
      if (url.length < TARGET_MAX_CHARS) return url;
      q -= 0.12;
    }
    return exportJpeg(opts.canvas!, Math.max(0.45, q));
  }

  const img = await loadImage(opts.originalSrc);
  let canvas = drawToCanvas(img, MAX_SIDE);
  let quality = 0.84;
  for (let attempt = 0; attempt < 8; attempt++) {
    const url = exportJpeg(canvas, quality);
    if (url.length < TARGET_MAX_CHARS) return url;
    quality -= 0.1;
    if (quality < 0.4) {
      canvas = drawToCanvas(img, Math.round(MAX_SIDE * 0.75));
      quality = 0.72;
    }
  }
  return exportJpeg(canvas, 0.55);
}