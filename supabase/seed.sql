-- ============================================================
-- Lelang Kebaikan Cigatas — Seed ilustrasi (Supabase/PostgreSQL)
-- Jalankan SETELAH schema.sql. ID eksplisit memakai OVERRIDING SYSTEM VALUE.
-- ============================================================

-- ---- Kegiatan ----
insert into public.events (id, slug, title, description, event_date, location, status, completed_at)
overriding system value values
  (1, 'persiapan-acara-cigatas', 'Persiapan Acara Cigatas',
   'Bersama kita penuhi kebutuhan acara komunitas Cigatas. Pilih item yang ingin kamu bantu — sekecil apa pun, sangat berarti.',
   '2026-11-29', 'Balai Warga Cigatas', 'active', null),
  (2, 'halal-bihalal-cigatas-2025', 'Halal Bihalal Cigatas',
   'Silaturahmi warga Cigatas setelah Idulfitri. Alhamdulillah berjalan lancar berkat gotong royong semua anggota.',
   '2025-04-13', 'Halaman Masjid Cigatas', 'archived', '2025-04-14 10:00:00+07');

-- ---- Item kegiatan aktif (1) ----
insert into public.items (id, event_id, name, target_qty, target_label, unit, note, sort_order, is_open)
overriding system value values
  (1, 1, 'Beras', 40, '40 Kg', 'Kg', 'Untuk konsumsi bersama saat acara.', 0, true),
  (2, 1, 'Kopi Campur', 8, '8 Dus', 'Dus', 'Sajian hangat untuk warga yang hadir.', 1, true),
  (3, 1, 'Air Mineral', null, 'Secukupnya', '', 'Botol atau gelas, sesuai kesediaan.', 2, true),
  (4, 1, 'Gula Pasir', 6, '6 Kg', 'Kg', 'Pendamping kopi dan teh.', 3, true),
  (5, 1, 'Mie Instan', 5, '5 Dus', 'Dus', 'Cadangan konsumsi panitia.', 4, true),
  (6, 1, 'Snack Anak', 60, '60 Bungkus', 'Bungkus', 'Untuk adik-adik yang ikut hadir.', 5, true),
  (7, 1, 'Kantong Plastik', null, 'Secukupnya', '', 'Membantu pembagian barang.', 6, true),
  (8, 1, 'Kebutuhan Lainnya', null, 'Sesuai arahan panitia', '', 'Terbuka untuk bantuan lain yang bermanfaat.', 7, true);

-- ---- Item kegiatan arsip (2) ----
insert into public.items (id, event_id, name, target_qty, target_label, unit, note, sort_order, is_open)
overriding system value values
  (9, 2, 'Beras', 30, '30 Kg', 'Kg', '', 0, false),
  (10, 2, 'Kopi', 6, '6 Dus', 'Dus', '', 1, false),
  (11, 2, 'Air Mineral', 10, '10 Dus', 'Dus', '', 2, false),
  (12, 2, 'Kue Kering', 25, '25 Toples', 'Toples', '', 3, false);

-- ---- Pengajuan kegiatan aktif ----
insert into public.submissions (id, event_id, item_id, nickname, qty, qty_label, message, contact, status, track_code, decided_at, decision_note)
overriding system value values
  (1, 1, 1, 'Kang Asep', 40, '40 Kg', 'Beras dari rumah, siap diantar Sabtu.', '', 'approved', 'CGT-BERAS-01', now(), 'Silakan antar ke balai warga, terima kasih!'),
  (2, 1, 2, 'Teh Nisa', 8, '8 Dus', 'Kopi campur dari warung saya.', '', 'approved', 'CGT-KOPI-01', now(), 'Ditunggu di balai warga ya.'),
  (3, 1, 3, 'Mang Ujang', 2, '2 Dus', 'Saya sanggup 2 dus air mineral.', '', 'approved', 'CGT-AIR-01', now(), 'Terima kasih, sisanya kita cari bersama.'),
  (4, 1, 3, 'Bu Ratna', 1, '1 Dus', 'Menyusul 1 dus kalau masih kurang.', '', 'pending', 'CGT-AIR-02', null, ''),
  (5, 1, 4, 'Pak Haji Dedi', 6, '6 Kg', 'Gula pasir 6 kg dari saya.', '', 'approved', 'CGT-GULA-01', now(), 'Matur nuwun.'),
  (6, 1, 5, 'Mas Budi', 5, '5 Dus', 'Mie instan 5 dus, siap.', '', 'approved', 'CGT-MIE-01', now(), 'Siap, ditunggu.'),
  (7, 1, 6, 'Teh Sari', 20, '20 Bungkus', 'Snack untuk 20 anak dari saya.', '', 'pending', 'CGT-SNACK-01', null, '');

-- ---- Pengajuan kegiatan arsip ----
insert into public.submissions (id, event_id, item_id, nickname, qty, qty_label, message, contact, status, track_code, decided_at, decision_note)
overriding system value values
  (8, 2, 9, 'Kang Asep', 32, '32 Kg', 'Beras lebih dari target, tidak apa-apa.', '', 'approved', 'CGT-HB-BERAS', '2025-04-10 09:00:00+07', 'Alhamdulillah, terima kasih.'),
  (9, 2, 10, 'Teh Nisa', 7, '7 Dus', 'Kopi 7 dus.', '', 'approved', 'CGT-HB-KOPI', '2025-04-10 09:10:00+07', 'Terima kasih.'),
  (10, 2, 11, 'Mang Ujang', 10, '10 Dus', 'Air mineral 10 dus.', '', 'approved', 'CGT-HB-AIR', '2025-04-11 08:00:00+07', 'Siap.'),
  (11, 2, 12, 'Bu Ratna', 25, '25 Toples', 'Kue kering buatan sendiri.', '', 'approved', 'CGT-HB-KUE', '2025-04-11 10:00:00+07', 'Masyaallah, terima kasih.');

-- ---- Pemenuhan kegiatan aktif ----
insert into public.fulfillments (id, item_id, submission_id, person_name, qty, qty_label, is_pic, received, note)
overriding system value values
  (1, 1, 1, 'Kang Asep', 40, '40 Kg', true, true, 'Diterima penuh, dititipkan di gudang balai.'),
  (2, 2, 2, 'Teh Nisa', 8, '8 Dus', true, true, 'Diterima penuh.'),
  (3, 3, 3, 'Mang Ujang', 2, '2 Dus', true, false, 'Belum diantar, dijadwalkan Jumat.'),
  (4, 4, 5, 'Pak Haji Dedi', 6, '6 Kg', true, true, 'Diterima.'),
  (5, 5, 6, 'Mas Budi', 5, '5 Dus', true, true, 'Diterima.');

-- ---- Pemenuhan kegiatan arsip ----
insert into public.fulfillments (id, item_id, submission_id, person_name, qty, qty_label, is_pic, received, note)
overriding system value values
  (6, 9, 8, 'Kang Asep', 32, '32 Kg', true, true, 'Diterima penuh.'),
  (7, 10, 9, 'Teh Nisa', 7, '7 Dus', true, true, 'Diterima.'),
  (8, 11, 10, 'Mang Ujang', 10, '10 Dus', true, true, 'Diterima.'),
  (9, 12, 11, 'Bu Ratna', 25, '25 Toples', true, true, 'Diterima.');

-- ---- Sisa barang kegiatan arsip ----
insert into public.surplus (id, event_id, item_id, item_name, qty, qty_label, condition, decision, decision_note, pic_name, outcome, resolved_at)
overriding system value values
  (1, 2, 9, 'Beras', 2, '2 Kg', 'sisa', 'disimpan', 'Sisa konsumsi, masih layak.', 'Panitia Gudang', 'Disimpan di gudang balai warga untuk kegiatan berikutnya.', '2025-04-14 10:00:00+07'),
  (2, 2, 10, 'Kopi', 1, '1 Dus', 'sisa', 'kegiatan_berikutnya', 'Masih tersegel.', 'Teh Nisa', 'Dialokasikan untuk pengajian bulan depan.', '2025-04-14 10:00:00+07'),
  (3, 2, 11, 'Air Mineral', 2, '2 Dus', 'sisa', 'ditukar', 'Ditukar dengan gula pasir di warung.', 'Mang Ujang', 'Ditukar 2 dus air dengan 3 kg gula pasir.', '2025-04-14 10:00:00+07'),
  (4, 2, 12, 'Kue Kering', 3, '3 Toples', 'berlebih', 'didonasikan', 'Masih layak konsumsi.', 'Bu Ratna', 'Didonasikan ke panti asuhan Al-Ikhlas.', '2025-04-14 10:00:00+07');

-- ---- Foto kegiatan arsip ----
insert into public.photos (id, event_id, file_path, caption)
overriding system value values
  (1, 2, '/images/arsip-1.webp', 'Silaturahmi warga saat halal bihalal.'),
  (2, 2, '/images/arsip-2.webp', 'Hasil gotong royong kebutuhan acara.');

-- ---- Reset sequence identity agar insert berikutnya tidak bentrok ----
select setval(pg_get_serial_sequence('public.events','id'), (select max(id) from public.events));
select setval(pg_get_serial_sequence('public.items','id'), (select max(id) from public.items));
select setval(pg_get_serial_sequence('public.submissions','id'), (select max(id) from public.submissions));
select setval(pg_get_serial_sequence('public.fulfillments','id'), (select max(id) from public.fulfillments));
select setval(pg_get_serial_sequence('public.surplus','id'), (select max(id) from public.surplus));
select setval(pg_get_serial_sequence('public.photos','id'), (select max(id) from public.photos));
