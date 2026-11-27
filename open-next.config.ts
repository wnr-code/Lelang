// Konfigurasi OpenNext untuk Cloudflare Worker.
// Semua halaman aplikasi ini force-dynamic (tidak ada ISR / static revalidation),
// sehingga memakai cache "dummy" bawaan — tanpa perlu bucket R2 maupun KV.
// Bila kelak ingin caching ISR, ganti incrementalCache ke r2IncrementalCache
// dan tambahkan binding R2 NEXT_INC_CACHE_R2_BUCKET di wrangler.jsonc.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
