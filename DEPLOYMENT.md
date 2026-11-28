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
| Supabase (database) | ✅ Skema + seed diterapkan; foto hanya menyimpan metadata di tabel `photos` |
| Cloudflare R2 (bucket `liqo`, binding `Lelang`) | ✅ Wajib untuk foto produksi — sudah diatur di `wrangler.jsonc` |
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
| Penyimpanan foto | filesystem `data/uploads` | **Cloudflare R2** bucket `liqo` (binding `Lelang`) |
| Sajian foto | `/api/uploads/{name}` | `/api/foto/{key}` (dibaca dari R2 oleh Worker) |

- Lapisan data **dual-mode**: `src/lib/queries.ts` + `src/lib/actions.ts` memilih Supabase bila
  env diisi; bila tidak, memakai SQLite. Modul SQLite di-import *lazy* sehingga tidak dievaluasi di Worker.
- `sharp` hanya dipakai skrip build/test (`generate-icons`, `test-actions`), **tidak** ikut di-bundle.
- `next/image` memakai `unoptimized: true` (foto sudah WebP ≤1600px), sehingga foto dari R2
  berfungsi tanpa binding Cloudflare Images (berbayar).
- Cache OpenNext memakai mode **dummy** (semua halaman `force-dynamic`). R2 dipakai **khusus foto**
  (bucket `liqo`, binding `Lelang`), bukan untuk cache.
- Foto: batas **2 MB** per file, dikompres otomatis ke WebP ≤1600px (photon WASM), lalu disimpan ke
  R2 dengan key `{eventId}/{timestamp}-{acak}.webp`. Tabel `photos` di Supabase hanya menyimpan
  path `/api/foto/...` + caption. Bucket **tidak perlu** domain publik — Worker yang menyajikan.

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
   - **Node version:** `22` (repo menyertakan `.nvmrc` = 22; bila build image tidak membacanya,
     set variabel build `NODE_VERSION=22`). Aplikasi diuji di Node 22.
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

Set via `wrangler secret put <NAMA>` (Jalur A) atau dashboard Workers → **Settings →
Variables and Secrets** (Jalur B — bagian *runtime*, **bukan** "Build variables").
**Jangan** menulis nilai rahasia di `wrangler.jsonc` atau commit ke git.

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `PANITIA_PASSWORD` | ✅ (Secret) | Kata sandi panitia. Ganti dari default! |
| `SESSION_SECRET` | ✅ (Secret) | String acak panjang untuk tanda tangan cookie sesi |
| `SUPABASE_URL` | sudah di `wrangler.jsonc` | `https://jxpjleqzpzrjbdrxxjgv.supabase.co` (URL publik, bukan rahasia) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ (Secret) | Supabase → Settings → API → `service_role` (RAHASIA, bypass RLS) |

`wrangler.jsonc` sudah berisi `vars.SUPABASE_URL` dan `keep_vars: true`:
- URL Supabase dijamin ada di runtime setiap deploy.
- `keep_vars` menjaga variabel dashboard tidak terhapus saat `wrangler deploy`
  (tanpa ini, deploy menghapus vars dashboard yang tidak tertulis di file config).
- Secrets tidak pernah dihapus oleh deploy.

Buat secret kuat:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> Tanpa `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, aplikasi jatuh ke mode SQLite — yang **tidak**
> berfungsi di Worker. Sejak perbaikan ini, aplikasi menampilkan pesan error yang jelas di
> Workers Logs (bukan error modul misterius).

**Diagnosis cepat:** buka `https://lelang.cgs.my.id/api/health` — menampilkan status
ada/tidaknya tiap variabel (tanpa nilainya) + hasil koneksi Supabase. `ready: true` = siap.

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

- Migrasi terbaru: `supabase/migrations/20261128_barang_tenaga_status.sql` (sudah diterapkan ke proyek asli)
  menambah `items.kind` (barang/tenaga), `submissions.unit` & `submissions.availability`,
  `fulfillments.received_at`, status pengajuan 5 tahap (pending/approved/needs_confirmation/rejected/done),
  dan pilihan sisa barang `disalurkan`. Untuk proyek baru cukup jalankan `schema.sql` terbaru.

- Skema: `supabase/schema.sql` — 6 tabel (events, items, submissions, fulfillments, surplus, photos),
  RLS aktif, akses server via service-role (bypass RLS).
- Seed: `supabase/seed.sql` — 2 kegiatan, 12 item, 11 pengajuan, 9 pemenuhan, 4 sisa, 2 foto.
  **Sudah diterapkan** ke proyek asli. Jangan jalankan ulang seed (ID eksplisit bisa bentrok).
- Foto: **Cloudflare R2** bucket `liqo` dengan binding **`Lelang`** (lihat `wrangler.jsonc`).
  Pastikan binding ini ada di Worker `lelang` (Settings → Bindings → R2 bucket). Supabase Storage
  bucket `photos` lama tidak dipakai lagi untuk upload baru (foto lama tetap tampil bila URL-nya tersimpan).
- Bila perlu proyek baru: jalankan `schema.sql` lalu `seed.sql` di SQL Editor Supabase, lalu isi env §5.

---

## 9. Ringkasan

- **Selesai:** aplikasi + kompatibilitas Worker (build & dry-run lulus) + ekspor PDF/Excel +
  skema/seed Supabase + bucket Storage + 54/54 uji.
- **Tinggal Anda lakukan:** deploy via Jalur A (`wrangler login` + `npm run deploy`) atau Jalur B
  (Workers Builds), isi 4 env vars, pastikan domain `lelang.cgs.my.id` aktif. Perhatikan §6 (paket
  Workers Paid untuk ukuran bundle ini).
## 10. Fase 3 — Kategori, jam acara, countdown & notifikasi Android

**Kategori kebutuhan (tab).** `items.category` ∈ `sembako | barang | tenaga | lainnya`.
Halaman `/kegiatan/[slug]` menampilkan tab **Sembako · Barang · Bantuan Tenaga · Lainnya**
(bukan daftar panjang). Panitia memilih kategori saat menambah/mengedit item; `kind`
(barang/tenaga) mengikuti kategori. Contoh tenaga: Juru Parkir, Tenaga Masak, Bongkar &
Angkut, Kebersihan, Penerima Tamu, Dokumentasi.

**Jam acara & countdown.** `events.event_time` (format `HH:MM`, WIB). Halaman acara &
beranda menampilkan hitung waktu berjalan (hari/jam/menit/detik) menuju acara. Contoh:
Liko Akbar 23 Des 2026 mulai **19:00** → pengingat otomatis **15:00** (4 jam sebelumnya).

**Notifikasi push Android (Hadir / Tidak).**
- Service worker `public/sw.js` menampilkan notifikasi sistem dengan aksi **✅ Hadir / 🙏 Tidak**.
- Anggota mengaktifkan lewat kartu "Pengingat Acara" di halaman acara / `/notifikasi`
  (izin notifikasi + langganan Web Push). Tombol **Coba Notifikasi** mengirim uji.
- Enkripsi payload RFC 8291 (aes128gcm) + VAPID RFC 8292 memakai WebCrypto & fetch
  (`src/lib/webpush.ts`) — jalan di Node maupun Cloudflare Worker, tanpa node:crypto.
- Kunci VAPID disimpan di `app_settings` (dibuat sekali otomatis). Bisa dioverride lewat
  env `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` (JWK JSON) + `VAPID_SUBJECT`.
- RSVP tersimpan di `event_rsvps`; panitia melihat rekap Hadir/Tidak di `/panitia/notifikasi`.

**Penjadwal pengingat (produksi).** `pg_cron` + `pg_net` di Supabase memanggil
`POST https://lelang.appwnr.workers.dev/api/cron/reminders` tiap **15 menit** dengan header
`x-cron-key` = `app_settings.cron_secret`. Route memvalidasi kunci (atau cookie panitia),
lalu mengirim pengingat untuk acara yang masuk jendela `[mulai − 4 jam, mulai)`.
Idempoten lewat tabel `push_reminders` (tidak kirim ganda). Panitia juga bisa memicu
manual lewat tombol **Kirim Pengingat Sekarang** di `/panitia/notifikasi`.

> Catatan: cron berjalan di sisi Supabase, jadi tidak perlu mengubah build command
> Workers Builds maupun menambah `scheduled` handler di Worker. Selama route
> `/api/cron/reminders` sudah ter-deploy, pengingat aktif otomatis.
>
> **Penting:** URL cron memakai domain `*.workers.dev` (bukan domain kustom
> `lelang.cgs.my.id`) karena domain kustom dilindungi Cloudflare Bot Fight Mode /
> challenge yang menolak permintaan server-ke-server (`403 Just a moment...`).
> Domain `workers.dev` tidak kena challenge, sehingga panggilan pg_net sampai ke Worker.

**Ukuran teks.** Dasar font dinaikkan 16→17px dan literal teks kecil +1px agar lebih
terbaca di HP Android. Judul "Lelang Kebaikan" memakai grafis ketuk palu
(`public/images/gavel.webp`).
