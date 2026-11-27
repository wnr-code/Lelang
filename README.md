# Lelang Kebaikan Cigatas ❤️

**Satu Kepedulian, Banyak Kebaikan.**

Papan gotong royong digital untuk komunitas Cigatas — bukan marketplace, bukan aplikasi administrasi rumit. Anggota cukup melihat kebutuhan dan menawarkan bantuan; panitia mengatur semuanya dari satu dashboard sederhana.

## Konsep

| Aspek | Keputusan |
| --- | --- |
| Anggota | Tanpa login, identitas cukup nama panggilan |
| Panitia | Login kata sandi (cookie sesi tertanda tangan HMAC) |
| Uang | Tidak ada nominal uang — semua bantuan berbentuk barang/kesediaan |
| Keputusan | Anggota mengajukan, panitia yang menetapkan penerima & penanggung jawab |
| Kegiatan | Setiap kegiatan punya link sendiri (`/kegiatan/<slug>`) untuk dibagikan ke WhatsApp |
| Sisa barang | Dicatat dengan keputusan (disimpan/ditukar/dijual/didonasikan/dll), riwayat permanen |
| Arsip | Kegiatan selesai otomatis masuk arsip lengkap dengan laporan & foto |
| Foto | Upload + kompres otomatis ke WebP (maks. 1600px) via `photon` (WASM, jalan di Worker & Node) |
| PWA | Manifest + ikon, bisa dipasang di homescreen Android (opsional) |

## Alur Anggota

1. Buka link dari grup WhatsApp → papan kegiatan.
2. Pilih item yang ingin dibantu → isi nama panggilan + jumlah kesediaan.
3. Kirim pengajuan → dapat **kode lacak** (mis. `CGT-ABC123`).
4. Cek status di `/lacak/<kode>` — menunggu / disetujui / ditolak, lengkap dengan catatan panitia.
5. Jika disetujui dan ditetapkan sebagai penanggung jawab, informasi itu tampil di halaman lacak.

## Dashboard Panitia — 4 Menu

1. **Kelola Kegiatan** — buat acara (draft → aktif → selesai/arsip), susun daftar kebutuhan, salin link publik.
2. **Pengajuan Anggota** — setujui/tolak dengan catatan; persetujuan otomatis mencatat kesediaan.
3. **Barang & Penanggung Jawab** — tandai barang diterima, tetapkan PJ per item, tambah bantuan manual.
4. **Laporan & Sisa Barang** — rekap pemenuhan, catat sisa/kelebihan barang + keputusan + hasil, upload dokumentasi foto.

## Teknologi

- **Next.js 15** (App Router, Server Actions) + **TypeScript**
- **Tailwind CSS v4** — desain modern, minimalis, humanis (emerald, cream, putih), mobile-first
- **Database dual-mode**: **Supabase** (Postgres) di produksi / **SQLite** (`node:sqlite`) untuk preview lokal — dipilih otomatis dari env
- **Cloudflare Worker** via `@opennextjs/cloudflare` + `wrangler` (konfigurasi `wrangler.jsonc`, `open-next.config.ts`)
- **Supabase Storage** (bucket `photos`) — penyimpanan foto produksi
- **photon** (WASM) — kompresi foto otomatis, jalan di Worker maupun Node
- **pdf-lib + exceljs** — ekspor laporan PDF/Excel dengan pilihan data
- **Plus Jakarta Sans** — tipografi lokal yang ramah

## Menjalankan

```bash
npm install
npm run dev        # pengembangan → http://localhost:3000
# atau produksi:
npm run build && npm start
```

### Variabel lingkungan (opsional, lihat `.env.example`)

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `PANITIA_PASSWORD` | `cigatas-berbagi` | Kata sandi login panitia. **Wajib diganti untuk pemakaian nyata.** |
| `SESSION_SECRET` | dev secret | Secret penanda tangan cookie sesi. Isi string acak panjang di produksi. |
| `SUPABASE_URL` | — | URL proyek Supabase (untuk produksi, lihat `DEPLOYMENT.md`). |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Service-role key Supabase (RAHASIA, hanya di server). |

### Ekspor Laporan (PDF/Excel)

Di menu **Laporan & Sisa Barang**, panel **Unduh Laporan** menyediakan:
- Pilihan data: **Semua**, **Sudah Terkumpul** (item terpenuhi), **Belum Terkumpul** (item belum terpenuhi).
- Pilihan format: **PDF** (A4 landscape, tabel berwarna) atau **Excel** (.xlsx, header beku & berwarna).
- Isi: target, terkumpul, kekurangan, status, dan penanggung jawab per item + ringkasan kegiatan.
- Endpoint: `GET /api/export?event=<id>&scope=<all|collected|pending>&format=<pdf|xlsx>` (wajib login panitia).

### Data

- **Preview lokal (SQLite):** database `data/cigatas.db` (dibuat otomatis, di-gitignore); foto upload di `data/uploads/` (disajikan lewat `/api/uploads/<nama>`).
- **Produksi (Worker):** data di Supabase; foto di Supabase Storage bucket `photos` (URL publik langsung).
- Seed ilustrasi: 1 kegiatan aktif ("Persiapan Acara Cigatas", 8 item) + 1 arsip ("Halal Bihalal Cigatas") dengan contoh sisa barang & foto.
- Reset data lokal: `npm run db:reset` lalu akses situs lagi.

### Utilitas

```bash
npm run icons      # regenerasi ikon PWA dari SVG
npm run db:reset   # hapus database (seed ulang otomatis)
npm test           # uji logika bisnis server actions + ekspor (54 pemeriksaan, tanpa browser)
```

> `npm test` menjalankan kode action asli di Node dengan mock `next/headers`, `next/cache`,
> dan `next/navigation` — memverifikasi auth, pengajuan, persetujuan, barang & PJ, sisa barang,
> arsip, kompresi foto, dan ekspor PDF/Excel. Test mereset database; jalankan `npm run db:reset`
> sesudahnya jika ingin kembali ke seed ilustrasi bersih.

### Deploy ke Cloudflare Worker

Lihat **`DEPLOYMENT.md`** untuk panduan lengkap. Ringkas:

```bash
npx wrangler login                 # login ke akun Cloudflare Anda
npx wrangler secret put PANITIA_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npm run deploy                     # build OpenNext + deploy ke worker `lelang`
```

Target: worker `lelang.appwnr.workers.dev` + domain `lelang.cgs.my.id`. Alternatif otomatis:
Cloudflare **Workers Builds** (hubungkan repo GitHub, build `npx opennextjs-cloudflare build`,
deploy `npx wrangler deploy`). Skema + seed Supabase dan bucket `photos` sudah diterapkan ke
proyek asli. Preview sandbox memakai SQLite karena jaringan sandbox terbatas. Catatan ukuran
bundle & paket Cloudflare ada di `DEPLOYMENT.md` §6.

## Struktur

```
src/
  app/
    page.tsx                  # papan utama (publik)
    kegiatan/[slug]/          # detail kegiatan + form bantuan
    lacak/                    # lacak pengajuan via kode
    arsip/                    # arsip kegiatan + detail laporan
    panitia/                  # dashboard 4 menu (login required)
    api/uploads/[name]/       # penyaji foto upload lokal (mode SQLite)
    api/export/               # unduh laporan PDF/Excel (login panitia)
  components/                 # UI bersama + komponen klien per menu
  lib/
    db.ts                     # skema SQLite + seed (preview lokal, lazy)
    supabase.ts               # klien Supabase service-role (produksi)
    queries.ts                # query baca dual-mode (async)
    supabase-queries.ts       # implementasi baca Supabase
    actions.ts                # server actions dual-mode (mutasi)
    supabase-actions.ts       # implementasi mutasi Supabase + Storage
    mappers.ts                # pemetaan baris Postgres → tipe aplikasi
    item-status.ts            # logika status kebutuhan (murni)
    photo.ts                  # kompresi foto photon (WASM)
    export.ts                 # bangun data + generate PDF/Excel
    auth.ts                   # sesi panitia HMAC
    types.ts                  # tipe bersama
supabase/                     # schema.sql + seed.sql (sudah diterapkan)
wrangler.jsonc                # konfigurasi Cloudflare Worker
open-next.config.ts           # konfigurasi adapter OpenNext
```

## Catatan Keamanan

- Kata sandi panitia dibandingkan dengan `timingSafeEqual`; sesi cookie `httpOnly`, `sameSite=lax`, kedaluwarsa 7 hari.
- Semua mutasi panitia dijaga `isPanitia()` di server action.
- Kode lacak pengajuan dibuat acak (6 karakter, alfabet tanpa ambigu) dan hanya menampilkan data pengajuan terkait.
- Nama file upload divalidasi ketat; path traversal ditolak.
- Untuk produksi: set `PANITIA_PASSWORD` dan `SESSION_SECRET` yang kuat, dan sajikan di belakang HTTPS.
