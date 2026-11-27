// Kompresi foto bersama untuk kedua mode (SQLite & Supabase).
// Memakai photon (WASM) yang jalan di Cloudflare Worker maupun Node, sehingga
// tidak bergantung pada sharp (native) di runtime. Sharp hanya dipakai skrip
// build/test (generate-icons, test-actions) yang tidak ikut di-bundle ke Worker.
//
// photon di-import lazy: entry `workerd` otomatis dipakai saat build Worker,
// entry `node` saat preview/test. Keduanya auto-inisialisasi WASM.

/** Kompres gambar ke WebP, sisi terpanjang maks 1600px, rasio aspek dipertahankan. */
export async function compressToWebp(input: Uint8Array): Promise<Uint8Array> {
  const { PhotonImage, resize, SamplingFilter } = await import("@cf-wasm/photon");
  const img = PhotonImage.new_from_byteslice(input);
  try {
    const w = img.get_width();
    const h = img.get_height();
    const scale = Math.min(1, 1600 / Math.max(w, h));
    const nw = Math.max(1, Math.round(w * scale));
    const nh = Math.max(1, Math.round(h * scale));
    const out = resize(img, nw, nh, SamplingFilter.Lanczos3);
    try {
      return out.get_bytes_webp();
    } finally {
      out.free();
    }
  } finally {
    img.free();
  }
}
