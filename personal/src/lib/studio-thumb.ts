/** Miniature JPEG (data URL) pour lier le Studio photo au stock — taille plafonnée. */
export function studioThumbFromCanvas(
  canvas: HTMLCanvasElement | null,
  maxChars = 100_000,
): string {
  if (!canvas) return "";
  let quality = 0.82;
  let data = canvas.toDataURL("image/jpeg", quality);
  while (data.length > maxChars && quality > 0.45) {
    quality -= 0.08;
    data = canvas.toDataURL("image/jpeg", quality);
  }
  if (data.length > maxChars) {
    const scaled = document.createElement("canvas");
    scaled.width = Math.floor(canvas.width * 0.65);
    scaled.height = Math.floor(canvas.height * 0.65);
    const ctx = scaled.getContext("2d");
    if (ctx) {
      ctx.drawImage(canvas, 0, 0, scaled.width, scaled.height);
      data = scaled.toDataURL("image/jpeg", 0.75);
    }
  }
  return data.length <= maxChars ? data : data.slice(0, maxChars);
}