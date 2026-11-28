-- Fase 3: kategori kebutuhan (tab), jam acara, push notification + RSVP Hadir/Tidak.
-- Aman dijalankan ulang (IF NOT EXISTS / WHERE NOT EXISTS).

-- 1) Kolom baru
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_time text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'barang'
  CHECK (category IN ('sembako','barang','tenaga','lainnya'));

-- 2) Kategori untuk data lama
UPDATE items SET category = 'tenaga' WHERE kind = 'tenaga';
UPDATE items SET category = 'sembako'
 WHERE kind = 'barang' AND (
   name ILIKE '%beras%' OR name ILIKE '%gula%' OR name ILIKE '%kopi%' OR name ILIKE '%mie%'
   OR name ILIKE '%air%' OR name ILIKE '%snack%' OR name ILIKE '%minyak%' OR name ILIKE '%teh%'
   OR name ILIKE '%kue%' OR name ILIKE '%susu%' OR name ILIKE '%telur%');
UPDATE items SET category = 'lainnya' WHERE kind = 'barang' AND name ILIKE '%lainnya%';

-- 3) Jam acara (WIB). Liko Akbar 23 Des 2026 mulai 19:00 → pengingat 15:00.
UPDATE events SET event_time = '19:00' WHERE event_date = '2026-12-23' AND event_time IS NULL;
UPDATE events SET event_time = '19:30' WHERE slug = 'persiapan-acara-cigatas' AND event_time IS NULL;
UPDATE events SET event_time = '09:00' WHERE slug = 'halal-bihalal-cigatas-2025' AND event_time IS NULL;

-- 4) Perluas bantuan tenaga + lengkapi kategori untuk acara aktif
INSERT INTO items (event_id, name, target_qty, target_label, unit, note, sort_order, is_open, kind, category)
SELECT e.id, v.name, v.qty, v.label, 'Orang', v.note, v.ord, true, 'tenaga', 'tenaga'
FROM events e
CROSS JOIN (VALUES
  ('Juru Parkir', 4, '4 Orang', 'Mengatur parkir kendaraan jamaah dengan ramah.', 90),
  ('Tenaga Masak (Dapur Umum)', 6, '6 Orang', 'Membantu memasak konsumsi untuk tamu.', 91),
  ('Tenaga Bongkar & Angkut', 4, '4 Orang', 'Menyiapkan dan menata barang di lokasi.', 92),
  ('Tenaga Kebersihan', 3, '3 Orang', 'Merapikan lokasi sebelum dan sesudah acara.', 93),
  ('Penerima Tamu', 3, '3 Orang', 'Menyambut dan mengarahkan tamu ke tempat duduk.', 94),
  ('Tenaga Dokumentasi', 2, '2 Orang', 'Mengabadikan momen kegiatan (foto/video).', 95)
) AS v(name, qty, label, note, ord)
WHERE e.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM items i WHERE i.event_id = e.id AND i.name = v.name);

INSERT INTO items (event_id, name, target_qty, target_label, unit, note, sort_order, is_open, kind, category)
SELECT e.id, v.name, v.qty, v.label, v.unit, v.note, v.ord, true, 'barang', v.cat
FROM events e
CROSS JOIN (VALUES
  ('Gula Pasir', 6, '6 Kg', 'Kg', 'Pendamping kopi dan teh.', 3, 'sembako'),
  ('Kopi', 8, '8 Dus', 'Dus', 'Sajian hangat untuk warga yang hadir.', 4, 'sembako'),
  ('Air Mineral', NULL, 'Secukupnya', '', 'Botol atau gelas, sesuai kesediaan.', 5, 'sembako'),
  ('Snack Anak', 60, '60 Bungkus', 'Bungkus', 'Untuk adik-adik yang ikut hadir.', 6, 'sembako'),
  ('Tikar / Karpet', 6, '6 Lembar', 'Lembar', 'Alas duduk jamaah saat acara.', 20, 'barang'),
  ('Sound System & Mic', 1, '1 Set', 'Set', 'Pengeras suara dan mikrofon acara.', 21, 'barang'),
  ('Kebutuhan Lainnya', NULL, 'Sesuai arahan panitia', '', 'Terbuka untuk bantuan lain yang bermanfaat.', 99, 'lainnya')
) AS v(name, qty, label, unit, note, ord, cat)
WHERE e.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM items i WHERE i.event_id = e.id AND i.name = v.name);

-- 5) Push notification + RSVP + pengingat + pengaturan aplikasi
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  nickname text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_rsvps (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id bigint NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  endpoint text NOT NULL DEFAULT '',
  nickname text NOT NULL DEFAULT '',
  answer text NOT NULL CHECK (answer IN ('hadir','tidak')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, endpoint)
);

CREATE TABLE IF NOT EXISTS push_reminders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id bigint NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, endpoint)
);

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_push_reminders_event ON push_reminders(event_id);

-- RLS aktif: hanya service-role (server) yang boleh akses; anon/public ditolak.
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
