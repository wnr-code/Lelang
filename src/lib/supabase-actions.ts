// Implementasi mutasi (write) lapisan data Supabase/PostgreSQL + Storage.
// Dipanggil oleh actions.ts bila isSupabaseConfigured() true.
// revalidatePath tetap ditangani di actions.ts (Next.js).
import { getSupabase, throwIfError, TABLES, PHOTO_BUCKET } from "./supabase";
import { newTrackCode, slugify } from "./auth";
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
}): Promise<Res> {
  const { error } = await getSupabase()
    .from(TABLES.events)
    .update({ title: p.title, description: p.description, event_date: p.eventDate || null, location: p.location })
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
  });
  throwIfError(error, "addItem");
  return ok("Item kebutuhan ditambahkan.");
}

export async function sbUpdateItem(p: {
  id: number;
  name: string;
  targetQty: number | null;
  targetLabel: string;
  unit: string;
  note: string;
}): Promise<Res> {
  const { error } = await getSupabase()
    .from(TABLES.items)
    .update({ name: p.name, target_qty: p.targetQty, target_label: p.targetLabel, unit: p.unit, note: p.note })
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

// ---------- Keputusan pengajuan ----------

export async function sbDecideSubmission(id: number, decision: "approved" | "rejected", note: string): Promise<Res> {
  const sb = getSupabase();
  const { data: sub, error: subErr } = await sb
    .from(TABLES.submissions)
    .select("item_id, nickname, qty, qty_label")
    .eq("id", id)
    .maybeSingle();
  throwIfError(subErr, "decideSubmission(baca)");
  if (!sub) return fail("Pengajuan tidak ditemukan.");
  const { error: upErr } = await sb
    .from(TABLES.submissions)
    .update({ status: decision, decided_at: nowISO(), decision_note: note.slice(0, 300) })
    .eq("id", id);
  throwIfError(upErr, "decideSubmission");

  if (decision === "approved") {
    const { data: existing, error: exErr } = await sb
      .from(TABLES.fulfillments)
      .select("id")
      .eq("submission_id", id)
      .maybeSingle();
    throwIfError(exErr, "decideSubmission(cek fulfillment)");
    if (!existing) {
      const { error: insErr } = await sb.from(TABLES.fulfillments).insert({
        item_id: sub.item_id,
        submission_id: id,
        person_name: sub.nickname,
        qty: sub.qty,
        qty_label: sub.qty_label,
      });
      throwIfError(insErr, "decideSubmission(insert fulfillment)");
    }
  } else {
    const { error: delErr } = await sb
      .from(TABLES.fulfillments)
      .delete()
      .eq("submission_id", id)
      .eq("received", false);
    throwIfError(delErr, "decideSubmission(hapus fulfillment)");
  }
  return ok(decision === "approved" ? "Pengajuan disetujui." : "Pengajuan ditolak.");
}

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

export async function sbToggleReceived(id: number, received: boolean): Promise<Res> {
  const { error } = await getSupabase().from(TABLES.fulfillments).update({ received }).eq("id", id);
  throwIfError(error, "toggleReceived");
  return ok(received ? "Barang ditandai diterima." : "Tanda diterima dibatalkan.");
}

export async function sbSetPic(itemId: number, fulfillmentId: number): Promise<Res> {
  const sb = getSupabase();
  const { error: e1 } = await sb.from(TABLES.fulfillments).update({ is_pic: false }).eq("item_id", itemId);
  throwIfError(e1, "setPic(reset)");
  const { error: e2 } = await sb.from(TABLES.fulfillments).update({ is_pic: true }).eq("id", fulfillmentId).eq("item_id", itemId);
  throwIfError(e2, "setPic");
  return ok("Penanggung jawab ditetapkan.");
}

export async function sbDeleteFulfillment(id: number): Promise<Res> {
  const { error } = await getSupabase().from(TABLES.fulfillments).delete().eq("id", id);
  throwIfError(error, "deleteFulfillment");
  return ok("Data barang dihapus.");
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
