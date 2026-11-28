-- Alur satu tombol Kelola Pengajuan + konsistensi penerimaan fisik.
-- Invarian: approved/done punya tepat satu fulfillment; approved = belum diterima,
-- done = diterima fisik. Transisi status + pemenuhan dilakukan atomik lewat RPC.

-- 1) Dedupe catatan pemenuhan per pengajuan (pertahankan yang diterima / terbaru).
with ranked as (
  select id, row_number() over (
    partition by submission_id
    order by received desc, received_at desc nulls last, id asc
  ) as rn
  from public.fulfillments
  where submission_id is not null
)
delete from public.fulfillments f using ranked r where f.id = r.id and r.rn > 1;

-- 2) Pengajuan yang pemenuhannya sudah diterima fisik harus berstatus done.
update public.submissions s
set status = 'done', decided_at = coalesce(s.decided_at, f.received_at, now())
from public.fulfillments f
where f.submission_id = s.id and f.received and s.status in ('pending','needs_confirmation','approved','rejected');

-- 3) Pengajuan done: pastikan catatan pemenuhan diterima + punya tanggal.
update public.fulfillments f
set received = true, received_at = coalesce(f.received_at, s.decided_at, now())
from public.submissions s
where f.submission_id = s.id and s.status = 'done'
  and (f.received is distinct from true or f.received_at is null);

-- 4) Pengajuan approved/done tanpa catatan pemenuhan → buat catatan sesuai status.
insert into public.fulfillments (item_id, submission_id, person_name, qty, qty_label, received, received_at)
select s.item_id, s.id, s.nickname, s.qty, s.qty_label,
  (s.status = 'done'),
  case when s.status = 'done' then coalesce(s.decided_at, now()) else null end
from public.submissions s
where s.status in ('approved','done')
  and not exists (select 1 from public.fulfillments f where f.submission_id = s.id);

-- 5) Status menunggu/konfirmasi/ditolak tidak boleh punya catatan pemenuhan belum diterima.
delete from public.fulfillments f using public.submissions s
where f.submission_id = s.id and s.status in ('pending','needs_confirmation','rejected') and not f.received;

-- 6) Satu catatan pemenuhan per pengajuan.
create unique index if not exists uq_fulfillments_submission
  on public.fulfillments (submission_id) where submission_id is not null;

-- 7) RPC atomik: transisi status pengajuan (satu tombol / keputusan eksplisit).
create or replace function public.panitia_submission_transition(
  p_id bigint, p_action text, p_note text default ''
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.submissions%rowtype;
  f public.fulfillments%rowtype;
  v_to text;
  v_now timestamptz := now();
  v_msg text;
  v_fid bigint;
  v_received_at timestamptz;
begin
  select * into s from public.submissions where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Pengajuan tidak ditemukan.');
  end if;
  select * into f from public.fulfillments where submission_id = p_id for update;

  if p_action = 'advance' then
    v_to := case s.status
      when 'pending' then 'approved'
      when 'needs_confirmation' then 'approved'
      when 'approved' then 'done'
      when 'rejected' then 'approved'
      else null end;
  elsif p_action = 'approve' then v_to := 'approved';
  elsif p_action = 'needs_confirmation' then v_to := 'needs_confirmation';
  elsif p_action = 'reject' then v_to := 'rejected';
  elsif p_action = 'receive' then v_to := 'done';
  elsif p_action = 'undo_receive' then v_to := 'approved';
  else
    return jsonb_build_object('ok', false, 'error', 'Aksi tidak valid.');
  end if;

  if v_to is null then
    return jsonb_build_object('ok', false, 'error', 'Pengajuan sudah selesai — tidak ada tahap berikutnya.');
  end if;
  if s.status = 'done' and p_action not in ('receive','undo_receive') then
    return jsonb_build_object('ok', false, 'error', 'Sudah diterima fisik. Batalkan penerimaan dulu sebelum mengubah status.');
  end if;
  if p_action = 'receive' and s.status not in ('approved','done') then
    return jsonb_build_object('ok', false, 'error', 'Setujui pengajuan dulu sebelum menandai diterima fisik.');
  end if;
  if p_action = 'undo_receive' and s.status not in ('done','approved') then
    return jsonb_build_object('ok', false, 'error', 'Hanya pengajuan yang sudah diterima yang bisa dibatalkan penerimaannya.');
  end if;
  if v_to in ('pending','needs_confirmation','rejected') and f.id is not null and f.received then
    return jsonb_build_object('ok', false, 'error', 'Sudah diterima fisik. Batalkan penerimaan dulu sebelum mengubah status.');
  end if;

  if v_to = 'approved' then
    if f.id is null then
      insert into public.fulfillments (item_id, submission_id, person_name, qty, qty_label, received, received_at)
      values (s.item_id, s.id, s.nickname, s.qty, s.qty_label, false, null)
      returning id, received_at into v_fid, v_received_at;
    else
      update public.fulfillments set received = false, received_at = null where id = f.id
      returning id, received_at into v_fid, v_received_at;
    end if;
  elsif v_to = 'done' then
    if f.id is null then
      insert into public.fulfillments (item_id, submission_id, person_name, qty, qty_label, received, received_at)
      values (s.item_id, s.id, s.nickname, s.qty, s.qty_label, true, v_now)
      returning id, received_at into v_fid, v_received_at;
    else
      update public.fulfillments set received = true, received_at = coalesce(f.received_at, v_now) where id = f.id
      returning id, received_at into v_fid, v_received_at;
    end if;
  else
    if f.id is not null then delete from public.fulfillments where id = f.id; end if;
    v_fid := null; v_received_at := null;
  end if;

  update public.submissions set status = v_to, decided_at = v_now, decision_note = left(p_note, 300) where id = p_id;

  v_msg := case
    when p_action = 'undo_receive' then 'Tanda diterima dibatalkan — kembali disetujui, belum diterima fisik.'
    when v_to = 'approved' then 'Disetujui — kesediaan dicatat, belum diterima fisik.'
    when v_to = 'done' then 'Diterima fisik — pengajuan selesai dan tercatat diterima.'
    when v_to = 'needs_confirmation' then 'Perlu konfirmasi — hubungi anggota lewat WhatsApp.'
    when v_to = 'rejected' then 'Pengajuan ditolak.'
    else 'Pengajuan kembali menunggu konfirmasi.' end;

  insert into public.status_logs (entity_type, entity_id, status, note, actor)
  values ('submission', p_id, v_to, left(coalesce(nullif(p_note, ''), v_msg), 300), 'panitia');

  return jsonb_build_object('ok', true, 'status', v_to, 'message', v_msg,
    'fulfillment_id', v_fid, 'received_at', v_received_at);
end $$;

-- 8) RPC atomik: hapus catatan pemenuhan; pengajuan terkait kembali menunggu.
create or replace function public.panitia_delete_fulfillment(p_id bigint)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  f public.fulfillments%rowtype;
begin
  select * into f from public.fulfillments where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Catatan pemenuhan tidak ditemukan.');
  end if;
  if f.submission_id is not null then
    perform 1 from public.submissions where id = f.submission_id for update;
    delete from public.fulfillments where id = p_id;
    update public.submissions set status = 'pending', decided_at = null, decision_note = '' where id = f.submission_id;
    insert into public.status_logs (entity_type, entity_id, status, note, actor)
    values ('submission', f.submission_id, 'pending', 'Catatan pemenuhan dihapus; pengajuan kembali menunggu konfirmasi.', 'panitia');
    return jsonb_build_object('ok', true, 'status', 'pending',
      'message', 'Catatan dihapus; pengajuan kembali menunggu konfirmasi.');
  end if;
  delete from public.fulfillments where id = p_id;
  return jsonb_build_object('ok', true, 'message', 'Data barang dihapus.');
end $$;

-- 9) Hanya service-role (server) yang boleh memanggil RPC ini.
revoke all on function public.panitia_submission_transition(bigint, text, text) from public, anon, authenticated;
revoke all on function public.panitia_delete_fulfillment(bigint) from public, anon, authenticated;
grant execute on function public.panitia_submission_transition(bigint, text, text) to service_role;
grant execute on function public.panitia_delete_fulfillment(bigint) to service_role;
