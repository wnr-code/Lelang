// Implementasi mutasi (write) lapisan data Supabase/PostgreSQL + Storage.
// Dipanggil oleh actions.ts bila isSupabaseConfigured() true.
// revalidatePath tetap ditangani di actions.ts (Next.js).
import { getSupabase, throwIfError, TABLES, PHOTO_BUCKET } from "./supabase";
import { newTrackCode, newProposalCode, slugify } from "./auth";
import { mapPhoto } from "./mappers";

type Res = { ok: true; message?: string; code?: string; id?: number } | { ok: false; error: string };
const ok = (message?: string, extra?: { code?: string; id?: number }): Res => ({ ok: true, message, ...extra });
const fail = (error: string): Res => ({ ok: false, error });

function nowISO(): string {
  return new Date().toISOString();
}

// ---------- Publik ----------

export async function sbSubmitHelp(p: {
  eventId: number;
  itemId: number;
  nickname: string;
  qty: number | null;
  label: string;
  message: string;
  contact: string;
  unit: string;
  availability: string;
}): Promise<Res> {
  const sb = getSupabase();
  let code = newTrackCode();
  for (let i = 0; i < 8; i++) {
    const { data, error } = await sb.from(TABLES.submissions).select("id").eq("track_code", code).maybeSingle();
    throwIfError(error, "submitHelp(cek kode)");
    if (!data) break;
    code = newTrackCode();
  }
  const { data, error } = await sb
    .from(TABLES.submissions)
    .insert({
      event_id: p.eventId,
      item_id: p.itemId,
      nickname: p.nickname,
      qty: p.qty,
      qty_label: p.label,
      unit: p.unit,
      availability: p.availability,
      message: p.message,
      contact: p.contact,
      status: "pending",
      track_code: code,
    })
    .select("id")
    .single();
  throwIfError(error, "submitHelp");
  return ok("Pengajuan terkirim! Simpan kode lacakmu.", { code, id: Number(data!.id) });
}

// ---------- Kegiatan ----------

export async function sbCreateEvent(p: {
  title: string;
  description: string;
  eventDate: string;
  location: string;
  eventTime: string | null;
}): Promise<Res> {
  const sb = getSupabase();
  let slug = slugify(p.title);
  for (let i = 0; i < 8; i++) {
    const { data, error } = await sb.from(TABLES.events).select("id").eq("slug", slug).maybeSingle();
    throwIfError(error, "createEvent(cek slug)");
    if (!data) break;
    slug = `${slugify(p.title)}-${Math.random().toString(16).slice(2, 6)}`;
  }
  const { data, error } = await sb
    .from(TABLES.events)
    .insert({
      slug,
      title: p.title,
      description: p.description,
      event_date: p.eventDate || null,
      location: p.location,
      event_time: p.eventTime,
      status: "draft",
    })
    .select("id")
    .single();
  throwIfError(error, "createEvent");
  return ok("Kegiatan dibuat sebagai draft.", { id: Number(data!.id) });
}

export async function sbUpdateEvent(p: {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  location: string;
  eventTime: string | null;
}): Promise<Res> {
  const { error } = await getSupabase()
    .from(TABLES.events)
    .update({ title: p.title, description: p.description, event_date: p.eventDate || null, location: p.location, event_time: p.eventTime })
    .eq("id", p.id);
  throwIfError(error, "updateEvent");
  return ok("Kegiatan diperbarui.");
}

export async function sbSetEventStatus(id: number, status: string): Promise<Res> {
  const sb = getSupabase();
  if (status === "completed" || status === "archived") {
    const { data, error } = await sb.from(TABLES.events).select("completed_at").eq("id", id).maybeSingle();
    throwIfError(error, "setEventStatus(baca)");
    const completedAt = data?.completed_at ? String(data.completed_at) : nowISO();
    const { error: upErr } = await sb.from(TABLES.events).update({ status, completed_at: completedAt }).eq("id", id);
    throwIfError(upErr, "setEventStatus");
  } else {
    const { error } = await sb.from(TABLES.events).update({ status, completed_at: null }).eq("id", id);
    throwIfError(error, "setEventStatus");
  }
  return ok("Status kegiatan diperbarui.");
}

export async function sbDeleteEvent(id: number): Promise<Res> {
  const { error } = await getSupabase().from(TABLES.events).delete().eq("id", id);
  throwIfError(error, "deleteEvent");
  return ok("Kegiatan dihapus.");
}

// ---------- Item ----------

export async function sbAddItem(p: {
  eventId: number;
  name: string;
  targetQty: number | null;
  targetLabel: string;
  unit: string;
  note: string;
  kind: "barang" | "tenaga";
  category: "sembako" | "barang" | "tenaga" | "lainnya";
}): Promise<Res> {
  const sb = getSupabase();
  const { data: maxRow, error: maxErr } = await sb
    .from(TABLES.items)
    .select("sort_order")
    .eq("event_id", p.eventId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(maxErr, "addItem(max sort)");
  const nextSort = (maxRow?.sort_order != null ? Number(maxRow.sort_order) : 0) + 1;
  const { error } = await sb.from(TABLES.items).insert({
    event_id: p.eventId,
    name: p.name,
    target_qty: p.targetQty,
    target_label: p.targetLabel,
    unit: p.unit,
    note: p.note,
    sort_order: nextSort,
    kind: p.kind,
    category: p.category,
  });
  throwIfError(error, "addItem");
  return ok(p.kind === "tenaga" ? "Kebutuhan tenaga ditambahkan." : "Item kebutuhan ditambahkan.");
}

export async function sbUpdateItem(p: {
  id: number;
  name: string;
  targetQty: number | null;
  targetLabel: string;
  unit: string;
  note: string;
  kind: "barang" | "tenaga";
  category: "sembako" | "barang" | "tenaga" | "lainnya";
}): Promise<Res> {
  const { error } = await getSupabase()
    .from(TABLES.items)
    .update({ name: p.name, target_qty: p.targetQty, target_label: p.targetLabel, unit: p.unit, note: p.note, kind: p.kind, category: p.category })
    .eq("id", p.id);
  throwIfError(error, "updateItem");
  return ok("Item diperbarui.");
}

export async function sbToggleItemOpen(id: number, isOpen: boolean): Promise<Res> {
  const { error } = await getSupabase().from(TABLES.items).update({ is_open: isOpen }).eq("id", id);
  throwIfError(error, "toggleItemOpen");
  return ok(isOpen ? "Item dibuka kembali." : "Item ditandai terpenuhi.");
}

export async function sbDeleteItem(id: number): Promise<Res> {
  const { error } = await getSupabase().from(TABLES.items).delete().eq("id", id);
  throwIfError(error, "deleteItem");
  return ok("Item dihapus.");
}

// Keputusan pengajuan & penerimaan kini ditangani atomik oleh RPC
// `panitia_submission_transition` / `panitia_delete_fulfillment`
// (lihat src/lib/submission-mutations.ts). Tidak ada mutasi multi-langkah di sini.

// ---------- Barang & penanggung jawab ----------

export async function sbAddFulfillment(p: {
  itemId: number;
  personName: string;
  qty: number | null;
  label: string;
  note: string;
}): Promise<Res> {
  const { error } = await getSupabase().from(TABLES.fulfillments).insert({
    item_id: p.itemId,
    person_name: p.personName,
    qty: p.qty,
    qty_label: p.label,
    note: p.note,
  });
  throwIfError(error, "addFulfillment");
  return ok("Data barang ditambahkan.");
}

export async function sbSetPic(itemId: number, fulfillmentId: number): Promise<Res> {
  const sb = getSupabase();
  const { error: e1 } = await sb.from(TABLES.fulfillments).update({ is_pic: false }).eq("item_id", itemId);
  throwIfError(e1, "setPic(reset)");
  const { error: e2 } = await sb.from(TABLES.fulfillments).update({ is_pic: true }).eq("id", fulfillmentId).eq("item_id", itemId);
  throwIfError(e2, "setPic");
  return ok("Penanggung jawab ditetapkan.");
}

// ---------- Surplus ----------

export async function sbAddSurplus(p: {
  eventId: number;
  itemId: number | null;
  itemName: string;
  qty: number | null;
  qtyLabel: string;
  condition: string;
  decision: string;
  decisionNote: string;
  picName: string;
  outcome: string;
}): Promise<Res> {
  const { error } = await getSupabase().from(TABLES.surplus).insert({
    event_id: p.eventId,
    item_id: p.itemId,
    item_name: p.itemName,
    qty: p.qty,
    qty_label: p.qtyLabel,
    condition: p.condition,
    decision: p.decision,
    decision_note: p.decisionNote,
    pic_name: p.picName,
    outcome: p.outcome,
    resolved_at: p.outcome ? nowISO() : null,
  });
  throwIfError(error, "addSurplus");
  return ok("Catatan sisa barang disimpan. Riwayat tidak akan hilang.");
}

export async function sbUpdateSurplus(p: {
  id: number;
  decision: string;
  decisionNote: string;
  picName: string;
  outcome: string;
}): Promise<Res> {
  const { error } = await getSupabase()
    .from(TABLES.surplus)
    .update({
      decision: p.decision,
      decision_note: p.decisionNote,
      pic_name: p.picName,
      outcome: p.outcome,
      resolved_at: p.outcome ? nowISO() : null,
    })
    .eq("id", p.id);
  throwIfError(error, "updateSurplus");
  return ok("Keputusan sisa barang diperbarui.");
}

export async function sbDeleteSurplus(id: number): Promise<Res> {
  const { error } = await getSupabase().from(TABLES.surplus).delete().eq("id", id);
  throwIfError(error, "deleteSurplus");
  return ok("Catatan dihapus.");
}

// ---------- Foto (metadata di Supabase; bytes di R2 / filesystem) ----------

export async function sbInsertPhoto(eventId: number, caption: string, filePath: string): Promise<Res> {
  const { error } = await getSupabase()
    .from(TABLES.photos)
    .insert({ event_id: eventId, file_path: filePath, caption });
  throwIfError(error, "insertPhoto(db)");
  return ok("Foto tersimpan.");
}

export async function sbDeletePhoto(id: number): Promise<Res> {
  const sb = getSupabase();
  const { data, error } = await sb.from(TABLES.photos).select("*").eq("id", id).maybeSingle();
  throwIfError(error, "deletePhoto(baca)");
  if (data) {
    const photo = mapPhoto(data);
    if (photo.file_path.startsWith("/api/foto/")) {
      const { isWorkerd, deletePhotoObject } = await import("./storage");
      if (isWorkerd()) await deletePhotoObject(photo.file_path.slice("/api/foto/".length));
    } else {
      const marker = `/object/public/${PHOTO_BUCKET}/`;
      const idx = photo.file_path.indexOf(marker);
      if (idx >= 0) await sb.storage.from(PHOTO_BUCKET).remove([photo.file_path.slice(idx + marker.length)]);
    }
  }
  const { error: delErr } = await sb.from(TABLES.photos).delete().eq("id", id);
  throwIfError(delErr, "deletePhoto");
  return ok("Foto dihapus.");
}

// ---------- Usulan item baru (proposal) ----------

export async function sbSubmitProposal(p: {
  eventId: number;
  name: string;
  qty: number | null;
  qtyLabel: string;
  unit: string;
  category: "sembako" | "barang" | "tenaga" | "lainnya";
  nickname: string;
  contact: string;
  note: string;
}): Promise<Res> {
  const sb = getSupabase();
  let code = newProposalCode();
  for (let i = 0; i < 8; i++) {
    const { data, error } = await sb.from(TABLES.item_proposals).select("id").eq("track_code", code).maybeSingle();
    throwIfError(error, "submitProposal(cek kode)");
    if (!data) break;
    code = newProposalCode();
  }
  const { data, error } = await sb
    .from(TABLES.item_proposals)
    .insert({
      event_id: p.eventId,
      name: p.name,
      qty: p.qty,
      qty_label: p.qtyLabel,
      unit: p.unit,
      category: p.category,
      nickname: p.nickname,
      contact: p.contact,
      note: p.note,
      status: "pending",
      track_code: code,
    })
    .select("id")
    .single();
  throwIfError(error, "submitProposal");
  return ok("Usulan terkirim! Menunggu persetujuan panitia.", { code, id: Number(data!.id) });
}

export async function sbUpdateProposal(p: {
  id: number;
  name: string;
  qty: number | null;
  qtyLabel: string;
  unit: string;
  category: "sembako" | "barang" | "tenaga" | "lainnya";
  note: string;
}): Promise<Res> {
  const { error } = await getSupabase()
    .from(TABLES.item_proposals)
    .update({ name: p.name, qty: p.qty, qty_label: p.qtyLabel, unit: p.unit, category: p.category, note: p.note })
    .eq("id", p.id);
  throwIfError(error, "updateProposal");
  return ok("Usulan diperbarui.");
}

export async function sbDecideProposal(p: {
  id: number;
  decision: "approved" | "rejected";
  note: string;
  name?: string;
  targetLabel?: string;
  unit?: string;
  category?: "sembako" | "barang" | "tenaga" | "lainnya";
  noteItem?: string;
}): Promise<Res> {
  const sb = getSupabase();
  const { data: prop, error } = await sb.from(TABLES.item_proposals).select("*").eq("id", p.id).maybeSingle();
  throwIfError(error, "decideProposal(baca)");
  if (!prop) return fail("Usulan tidak ditemukan.");
  const row = prop as Record<string, unknown>;
  if (row.status !== "pending") return fail("Usulan ini sudah diputuskan sebelumnya.");

  let approvedItemId: number | null = null;
  if (p.decision === "approved") {
    const category = (p.category ?? String(row.category)) as "sembako" | "barang" | "tenaga" | "lainnya";
    const kind = category === "tenaga" ? "tenaga" : "barang";
    const name = (p.name ?? String(row.name)).slice(0, 100);
    const unit = (p.unit ?? String(row.unit ?? "")).slice(0, 30);
    const qtyLabel = String(row.qty_label ?? "");
    const qty = row.qty == null ? null : Number(row.qty);
    const targetLabel = (p.targetLabel ?? (qtyLabel || (qty != null ? `${qty}${unit ? " " + unit : ""}` : "Secukupnya"))).slice(0, 80);
    const targetQty = parseTargetQtyServer(targetLabel);
    const itemRes = await sbAddItem({
      eventId: Number(row.event_id),
      name,
      targetQty,
      targetLabel,
      unit,
      note: (p.noteItem ?? String(row.note ?? "")).slice(0, 1000),
      kind,
      category,
    });
    if (!itemRes.ok) return itemRes;
    approvedItemId = itemRes.id ?? null;
  }
  const { error: upErr } = await sb
    .from(TABLES.item_proposals)
    .update({ status: p.decision, decided_at: nowISO(), decision_note: p.note.slice(0, 300), approved_item_id: approvedItemId })
    .eq("id", p.id);
  throwIfError(upErr, "decideProposal");
  return ok(p.decision === "approved" ? "Usulan disetujui & menjadi kebutuhan resmi." : "Usulan ditolak.", { id: approvedItemId ?? undefined });
}

function parseTargetQtyServer(targetLabel: string): number | null {
  const m = targetLabel.replace(",", ".").match(/^(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

export async function sbSetPanitiaWa(wa: string): Promise<Res> {
  const { error } = await getSupabase().from(TABLES.app_settings).upsert({ key: "panitia_wa", value: wa });
  throwIfError(error, "setPanitiaWa");
  return ok("Nomor WhatsApp panitia disimpan.");
}
