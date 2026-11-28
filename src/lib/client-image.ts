// Kompresi gambar sisi-klien (browser) sebelum upload.
// Target: hasil ≤ 2 MB agar sesuai batas upload, hemat kuota, dan ringan di Worker.
// Mencoba beberapa preset (dimensi + kualitas) sampai muat; jika browser tidak
// mendukung, kembalikan file asli (server akan memvalidasi ulang).

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

const PRESETS: Array<[number, number]> = [
  [1600, 0.85],
  [1280, 0.75],
  [1024, 0.65],
  [800, 0.6],
];

export async function compressImageForUpload(file: File, maxBytes = MAX_UPLOAD_BYTES): Promise<File> {
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") return file;
  const okType = /^image\/(jpeg|png|webp|gif|bmp)/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!okType) return file;
  if (file.size <= maxBytes) return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const base = file.name.replace(/\.[^.]+$/, "") || "foto";
    let smallest: File = file;
    for (const [maxDim, quality] of PRESETS) {
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (!blob) continue;
      const candidate = new File([blob], `${base}.webp`, { type: "image/webp", lastModified: Date.now() });
      if (candidate.size < smallest.size) smallest = candidate;
      if (candidate.size <= maxBytes) return candidate;
    }
    return smallest;
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
