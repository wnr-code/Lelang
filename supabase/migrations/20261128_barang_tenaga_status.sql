-- ============================================================
-- Lelang Kebaikan Cigatas — sistem barang/sembako + bantuan tenaga
-- 1. items.kind  : barang | tenaga
-- 2. submissions : unit, availability, status 5 tahap
-- 3. fulfillments: received_at (tanggal penerimaan)
-- 4. surplus     : pilihan "disalurkan"
-- Aman dijalankan berulang (idempotent).
-- ============================================================

alter table public.items
  add column if not exists kind text not null default 'barang';
alter table public.items drop constraint if exists items_kind_check;
alter table public.items add constraint items_kind_check check (kind in ('barang','tenaga'));

alter table public.submissions add column if not exists unit text not null default '';
alter table public.submissions add column if not exists availability text not null default '';
alter table public.submissions drop constraint if exists submissions_status_check;
alter table public.submissions add constraint submissions_status_check
  check (status in ('pending','approved','needs_confirmation','rejected','done'));

alter table public.fulfillments add column if not exists received_at timestamptz;
update public.fulfillments set received_at = created_at where received = true and received_at is null;

alter table public.surplus drop constraint if exists surplus_decision_check;
alter table public.surplus add constraint surplus_decision_check
  check (decision in ('disimpan','kegiatan_berikutnya','ditukar','dijual','disalurkan','didonasikan','lainnya'));

-- Kebutuhan tenaga awal untuk kegiatan yang sedang aktif (bila belum ada).
insert into public.items (event_id, name, target_qty, target_label, unit, note, sort_order, is_open, kind)
select e.id, v.name, v.qty, v.label, 'Orang', v.note, v.ord, true, 'tenaga'
from public.events e
cross join (values
  ('Tenaga Masak (Dapur Umum)', 6::float8, '6 Orang', 'Membantu memasak konsumsi untuk tamu.', 90),
  ('Tenaga Bongkar & Angkut', 4::float8, '4 Orang', 'Menyiapkan dan menata barang di lokasi.', 91),
  ('Tenaga Kebersihan', 3::float8, '3 Orang', 'Merapikan lokasi sebelum dan sesudah acara.', 92)
) as v(name, qty, label, note, ord)
where e.status = 'active'
  and not exists (
    select 1 from public.items i where i.event_id = e.id and i.kind = 'tenaga'
  );
