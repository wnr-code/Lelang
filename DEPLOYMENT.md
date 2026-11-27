# Panduan Deploy — Lelang Kebaikan Cigatas (Cloudflare Worker)

Target: **Cloudflare Worker** `lelang.appwnr.workers.dev` + domain kustom **`lelang.cgs.my.id`**
+ database **Supabase**. Worker dan domain sudah Anda buat; aplikasi kini **siap di-deploy**.

---

## 1. Status saat ini

| Komponen | Status |
| --- | --- |
| Aplikasi (Next.js 15, App Router) | ✅ Build produksi sukses |
| Kompatibilitas Cloudflare Worker | ✅ Migrasi selesai, `opennextjs-cloudflare build` + `wrangler deploy --dry-run` lulus |
| Database Supabase (skema + seed) | ✅ Sudah diterapkan ke proyek `supabase-rose-park` (ref `jxpjleqzpzrjbdrxxjgv`) |
| Supabase Storage (bucket `photos`) | ✅ Sudah dibuat (publik, maks 15 MB, webp/jpeg/png) |
| Ekspor PDF/Excel (pilihan data) | ✅ Selesai & teruji |
| Uji logika bisnis | ✅ `npm test` → 54/54 lulus |
| Deploy ke Worker + domain | ⚠️ Tinggal dijalankan di akun Cloudflare Anda (lihat §3) |

> Preview di sandbox ini memakai **SQLite** (`node:sqlite`) karena jaringan sandbox tidak bisa
> menjangkau `supabase.co`. Di produksi (Worker), aplikasi otomatis memakai **Supabase** bila
> env `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` diisi. Tidak ada perubahan kode yang diperlukan.

---

## 2. Arsitektur runtime (apa yang berubah untuk Worker)

Cloudflare Worker tidak bisa menjalankan `node:sqlite`, `sharp` (native), atau tulis filesystem.
Aplikasi sudah disesuaikan:

| Kebutuhan | Preview lokal (Node) | Produksi (Cloudflare Worker) |
| --- | --- | --- |
| Database | SQLite (`data/cigatas.db`) | **Supabase** (PostgreSQL) |
| Kompresi foto | **photon** (WASM) | **photon** (WASM) — sama, jalan di workerd |
| Penyimpanan foto | filesystem `data/uploads` | **Supabase Storage** bucket `photos` |
| Sajian foto | `/api/uploads/{name}` | URL publik Storage langsung |

- Lapisan data **dual-mode**: `src/lib/queries.ts` + `src/lib/actions.ts` memilih Supabase bila
  env diisi; bila tidak, memakai SQLite. Modul SQLite di-import *lazy* sehingga tidak dievaluasi di Worker.
- `sharp` hanya dipakai skrip build/test (`generate-icons`, `test-actions`), **tidak** ikut di-bundle.
- `next/image` memakai `unoptimized: true` (foto sudah WebP ≤1600px), sehingga URL Storage remote
  berfungsi tanpa binding Cloudflare Images (berbayar).
- Cache OpenNext memakai mode **dummy** (semua halaman `force-dynamic`), jadi **tidak butuh R2**.

Adapter: `@opennextjs/cloudflare` + `wrangler`. Konfigurasi: `wrangler.jsonc`, `open-next.config.ts`.

---

## 3. Deploy ke Cloudflare Worker

Tidak ada koneksi API Cloudflare dari sandbox ini, jadi deploy dijalankan di akun Anda.
Pilih **salah satu** jalur berikut.

### Jalur A — Paling langsung: `wrangler` dari komputer Anda

```bash
# 1. Ambil kode terbaru (branch arena/f17867f4-lelang atau main setelah di-merge)
git clone https://github.com/wnr-code/Lelang.git
cd Lelang
npm install

# 2. Login ke Cloudflare (membuka browser)
npx wrangler login

# 3. Isi rahasia produksi (lihat §5). Contoh:
npx wrangler secret put PANITIA_PASSWORD
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# 4. Build + deploy sekaligus
npm run deploy
```

`npm run deploy` = `opennextjs-cloudflare build && opennextjs-cloudflare deploy`.
Setelah selesai, situs live di `https://lelang.appwnr.workers.dev`.

> Nama worker di `wrangler.jsonc` adalah **`lelang`** — harus sama dengan Worker yang sudah Anda
> buat (`lelang.appwnr.workers.dev`). Bila berbeda, ubah field `name` dan `services[].service`.

### Jalur B — Otomatis via GitHub (Cloudflare Workers Builds)

Cocok bila ingin setiap `git push` otomatis deploy.

1. Buka **dash.cloudflare.com** → **Workers & Pages** → worker **`lelang`** → tab **Settings** →
   **Builds** (atau **Create** → **Workers** → **Connect to Git**).
2. Hubungkan repo GitHub **`wnr-code/Lelang`**, branch produksi (mis. `main`).
3. Build settings:
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command:** `npx wrangler deploy`
   - **Root directory:** `/` (root repo)
4. Tambahkan **environment variables** (lihat §5) di settings Builds/Variables.
5. Simpan → trigger build pertama. Setiap push ke branch akan build + deploy otomatis.

> Karena sandbox sudah push ke branch `arena/f17867f4-lelang`, Anda bisa merge ke `main` dulu
> (atau arahkan Workers Builds ke branch tersebut) agar build mengambil kode terbaru.

---

## 4. Domain kustom `lelang.cgs.my.id`

Anda sudah menetapkan domain kustom ke Worker. Bila belum aktif / perlu dicek:

1. **dash.cloudflare.com** → worker **`lelang`** → **Settings** → **Domains & Routes** →
   pastikan `lelang.cgs.my.id` terdaftar sebagai **Custom Domain**.
2. DNS domain `cgs.my.id` harus berada di Cloudflare (atau CNAME `lelang` diarahkan ke
   `lelang.appwnr.workers.dev` dengan proxy aktif). Custom Domain Worker biasanya membuat
   record DNS otomatis bila zona `cgs.my.id` ada di akun Cloudflare yang sama.
3. Propagasi DNS: beberapa menit hingga maksimal 24 jam. Setelah aktif, situs tersedia di
   **`https://lelang.cgs.my.id`** (HTTPS otomatis).

---

## 5. Environment variables (produksi)

Set via `wrangler secret put <NAMA>` (Jalur A) atau dashboard Workers → Settings → Variables
(Jalur B). **Jangan** menulis nilai rahasia di `wrangler.jsonc` atau commit ke git.

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `PANITIA_PASSWORD` | ✅ | Kata sandi panitia. Ganti dari default! |
| `SESSION_SECRET` | ✅ | String acak panjang untuk tanda tangan cookie sesi |
| `SUPABASE_URL` | ✅ | `https://jxpjleqzpzrjbdrxxjgv.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase → Settings → API → `service_role` (RAHASIA, bypass RLS) |

Buat secret kuat:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> Tanpa `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, aplikasi jatuh ke mode SQLite — yang **tidak**
> berfungsi di Worker (filesystem read-only). Jadi keempat variabel di atas wajib diisi di produksi.

Untuk **preview lokal** (`npm run preview`, wrangler dev): salin `.dev.vars.example` → `.dev.vars`
dan isi nilainya. File `.dev.vars` di-ignore git.

---

## 6. Ukuran bundle & paket Cloudflare (PENTING, jujur)

Bundle Worker terukur: **~12,2 MB mentah / ~3,4 MB gzip** (runtime Next.js + photon WASM +
pustaka ekspor PDF/Excel + klien Supabase).

Batas ukuran script Cloudflare Workers (setelah kompresi gzip):
- **Free:** 1 MB
- **Workers Paid:** 10 MB ($5/bln)

Dengan ~3,4 MB gzip, deploy **memerlukan paket Workers Paid**. Bila akun Anda Free, `wrangler
deploy` akan menolak dengan error ukuran script. Solusi: upgrade ke Workers Paid, atau kecilkan
fitur (mis. hapus ekspor PDF/Excel / kompresi foto sisi server) — tidak disarankan karena mengurangi
fungsi yang diminta. Ukuran ini normal untuk aplikasi Next.js + OpenNext dengan fitur lengkap.

---

## 7. Perintah pengembang

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Next dev (SQLite, preview lokal) |
| `npm start` | Next produksi lokal (SQLite) — dipakai preview sandbox |
| `npm test` | 54 pemeriksaan logika bisnis (mode SQLite) |
| `npm run db:reset` | Reset database SQLite ke seed ilustrasi |
| `npm run cf:build` | Build bundle Worker (`.open-next/`) |
| `npm run preview` | Build + wrangler dev (baca `.dev.vars`) |
| `npm run deploy` | Build + deploy ke Cloudflare Worker |
| `npm run cf-typegen` | Generate tipe binding Cloudflare (`cloudflare-env.d.ts`) |

---

## 8. Supabase (sudah siap)

- Skema: `supabase/schema.sql` — 6 tabel (events, items, submissions, fulfillments, surplus, photos),
  RLS aktif, akses server via service-role (bypass RLS).
- Seed: `supabase/seed.sql` — 2 kegiatan, 12 item, 11 pengajuan, 9 pemenuhan, 4 sisa, 2 foto.
  **Sudah diterapkan** ke proyek asli. Jangan jalankan ulang seed (ID eksplisit bisa bentrok).
- Storage: bucket `photos` (publik) + policy baca publik. Foto produksi disimpan di sini.
- Bila perlu proyek baru: jalankan `schema.sql` lalu `seed.sql` di SQL Editor Supabase, buat bucket
  publik `photos`, lalu isi env §5.

---

## 9. Ringkasan

- **Selesai:** aplikasi + kompatibilitas Worker (build & dry-run lulus) + ekspor PDF/Excel +
  skema/seed Supabase + bucket Storage + 54/54 uji.
- **Tinggal Anda lakukan:** deploy via Jalur A (`wrangler login` + `npm run deploy`) atau Jalur B
  (Workers Builds), isi 4 env vars, pastikan domain `lelang.cgs.my.id` aktif. Perhatikan §6 (paket
  Workers Paid untuk ukuran bundle ini).