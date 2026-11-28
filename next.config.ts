import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Foto sudah dikompres ke WebP ≤1600px saat upload. Optimizer gambar Next.js
  // tidak tersedia di Cloudflare Worker tanpa binding Cloudflare Images (berbayar),
  // jadi pakai gambar apa adanya. Ini juga mengizinkan URL remote Supabase Storage
  // tanpa perlu remotePatterns.
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  // Server Actions membatasi body default 1 MB — terlalu kecil untuk foto HP.
  // Foto maks 2 MB (divalidasi di action), jadi beri ruang lebih untuk multipart.
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

// Setup binding Cloudflare hanya saat `next dev` (miniflare). Tidak dijalankan
// saat `next build`/`next start` (preview produksi memakai SQLite + filesystem).
if (process.env.NODE_ENV === "development") {
  import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
}

export default nextConfig;
