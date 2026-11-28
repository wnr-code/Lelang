-- Fase 4: usulan item baru (terpisah dari pengajuan infaq), riwayat status, proteksi spam.
-- Aman dijalankan ulang (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS item_proposals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id bigint NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  qty double precision,
  qty_label text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'barang' CHECK (category IN ('sembako','barang','tenaga','lainnya')),
  nickname text NOT NULL,
  contact text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  track_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decision_note text NOT NULL DEFAULT '',
  approved_item_id bigint REFERENCES items(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS status_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type text NOT NULL CHECK (entity_type IN ('submission','proposal')),
  entity_id bigint NOT NULL,
  status text NOT NULL,
  note text NOT NULL DEFAULT '',
  actor text NOT NULL DEFAULT 'sistem' CHECK (actor IN ('anggota','panitia','sistem')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_proposals_event ON item_proposals(event_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON item_proposals(status);
CREATE INDEX IF NOT EXISTS idx_status_logs_entity ON status_logs(entity_type, entity_id);

-- Hanya service-role (server) yang boleh akses; anon/public ditolak.
ALTER TABLE item_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
