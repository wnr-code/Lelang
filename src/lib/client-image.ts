// Kompresi gambar sisi-klien (browser) sebelum upload.
// Tujuan: foto dari kamera HP yang besar diperkecil dulu di perangkat,
// sehingga upload lebih cepat, hemat kuota, dan tidak membebani Worker.
// Jika browser tidak mendukung, kembalikan file asli (server tetap mengompres).

export async function compressImageForUpload(file: File, maxDim = 1600, quality = 0.85): Promise<File> {
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") return file;
  const okType = /^image\/(jpeg|png|webp|gif|bmp)/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!okType) return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
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
    // Hanya pakai hasil kompres bila benar-benar lebih kecil.
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${base}.webp`, { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
