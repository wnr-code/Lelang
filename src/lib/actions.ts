"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { createSession, destroySession, isPanitia, newTrackCode, slugify, verifyPassword } from "./auth";
import { getEventById, getItemById } from "./queries";
import { isSupabaseConfigured, loadSqliteDb } from "./supabase";
import {
  sbSubmitHelp,
  sbCreateEvent,
  sbUpdateEvent,
  sbSetEventStatus,
  sbDeleteEvent,
  sbAddItem,
  sbUpdateItem,
  sbToggleItemOpen,
  sbDeleteItem,
  sbDecideSubmission,
  sbAddFulfillment,
  sbToggleReceived,
  sbSetPic,
  sbDeleteFulfillment,
  sbAddSurplus,
  sbUpdateSurplus,
  sbDeleteSurplus,
  sbUploadPhoto,
  sbDeletePhoto,
} from "./supabase-actions";

export type ActionResult = { ok: true; message?: string; code?: string; id?: number } | { ok: false; error: string };

const ok = (message?: string, extra?: { code?: string; id?: number }): ActionResult => ({ ok: true, message, ...extra });
const fail = (error: string): ActionResult => ({ ok: false, error });

async function guard(): Promise<boolean> {
  return isPanitia();
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

// ---------- Auth ----------

export async function loginAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") || "");
  if (!verifyPassword(password)) return fail("Kata sandi salah. Coba lagi.");
  await createSession();
  redirect("/panitia");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/panitia/login");
}

// ---------- Publik: pengajuan bantuan ----------

export async function submitHelpAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const itemId = Number(formData.get("item_id"));
  const nickname = String(formData.get("nickname") || "").trim().slice(0, 40);
  const qtyRaw = String(formData.get("qty") || "").trim();
  const qtyLabel = String(formData.get("qty_label") || "").trim().slice(0, 40);
  const message = String(formData.get("message") || "").trim().slice(0, 300);
  const contact = String(formData.get("contact") || "").trim().slice(0, 60);

  if (!nickname) return fail("Nama panggilan wajib diisi.");
  const item = await getItemById(itemId);
  if (!item) return fail("Item tidak ditemukan.");
  const event = await getEventById(item.event_id);
  if (!event || event.status !== "active") return fail("Kegiatan ini sudah tidak menerima pengajuan.");
  if (!item.is_open) return fail("Item ini sudah terpenuhi. Pilih item lain ya.");

  let qty: number | null = null;
  if (qtyRaw) {
    qty = Number(qtyRaw.replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0) return fail("Jumlah kesediaan tidak valid.");
  }
  if (qty == null && !qtyLabel) return fail("Isi jumlah kesediaan (angka atau keterangan singkat).");

  const label = qtyLabel || (qty != null ? `${qty}${item.unit ? " " + item.unit : ""}` : "");

  if (isSupabaseConfigured()) {
    const r = await sbSubmitHelp({ eventId: item.event_id, itemId, nickname, qty, label, message, contact });
    revalidatePath(`/kegiatan/${event.slug}`);
    revalidatePath("/panitia/pengajuan");
    return r;
  }

  const { getDb } = await loadSqliteDb();
  const db = getDb();
  let code = newTrackCode();
  while (db.prepare("SELECT 1 FROM submissions WHERE track_code = ?").get(code)) code = newTrackCode();
  const res = db
    .prepare(
      `INSERT INTO submissions (event_id,item_id,nickname,qty,qty_label,message,contact,status,track_code)
       VALUES (?,?,?,?,?,?,?,'pending',?)`
    )
    .run(item.event_id, itemId, nickname, qty, label, message, contact, code);

  revalidatePath(`/kegiatan/${event.slug}`);
  revalidatePath("/panitia/pengajuan");
  return ok("Pengajuan terkirim! Simpan kode lacakmu.", { code, id: Number(res.lastInsertRowid) });
}

// ---------- Panitia: kegiatan ----------

export async function createEventAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  const title = String(formData.get("title") || "").trim().slice(0, 100);
  const description = String(formData.get("description") || "").trim().slice(0, 600);
  const eventDate = String(formData.get("event_date") || "").trim();
  const location = String(formData.get("location") || "").trim().slice(0, 100);
  if (!title) return fail("Nama kegiatan wajib diisi.");

  if (isSupabaseConfigured()) {
    const r = await sbCreateEvent({ title, description, eventDate, location });
    revalidateAll();
    return r;
  }

  const { getDb } = await loadSqliteDb();
  const db = getDb();
  let slug = slugify(title);
  while (db.prepare("SELECT 1 FROM events WHERE slug = ?").get(slug)) slug = `${slug}-${crypto.randomBytes(2).toString("hex")}`;
  const res = db
    .prepare("INSERT INTO events (slug,title,description,event_date,location,status) VALUES (?,?,?,?,?,'draft')")
    .run(slug, title, description, eventDate || null, location);
  revalidateAll();
  return ok("Kegiatan dibuat sebagai draft.", { id: Number(res.lastInsertRowid) });
}

export async function updateEventAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim().slice(0, 100);
  const description = String(formData.get("description") || "").trim().slice(0, 600);
  const eventDate = String(formData.get("event_date") || "").trim();
  const location = String(formData.get("location") || "").trim().slice(0, 100);
  if (!title) return fail("Nama kegiatan wajib diisi.");

  if (isSupabaseConfigured()) {
    const r = await sbUpdateEvent({ id, title, description, eventDate, location });
    revalidateAll();
    return r;
  }

  const { getDb } = await loadSqliteDb();
  getDb()
    .prepare("UPDATE events SET title=?, description=?, event_date=?, location=? WHERE id=?")
    .run(title, description, eventDate || null, location, id);
  revalidateAll();
  return ok("Kegiatan diperbarui.");
}

export async function setEventStatusAction(id: number, status: string): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  if (!["draft", "active", "completed", "archived"].includes(status)) return fail("Status tidak valid.");

  if (isSupabaseConfigured()) {
    const r = await sbSetEventStatus(id, status);
    revalidateAll();
    return r;
  }

  const { getDb } = await loadSqliteDb();
  const db = getDb();
  if (status === "completed" || status === "archived") {
    db.prepare("UPDATE events SET status=?, completed_at=COALESCE(completed_at, datetime('now')) WHERE id=?").run(status, id);
  } else {
    db.prepare("UPDATE events SET status=?, completed_at=NULL WHERE id=?").run(status, id);
  }
  revalidateAll();
  return ok("Status kegiatan diperbarui.");
}

export async function deleteEventAction(id: number): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  if (isSupabaseConfigured()) {
    const r = await sbDeleteEvent(id);
    revalidateAll();
    return r;
  }
  const { getDb } = await loadSqliteDb();
  getDb().prepare("DELETE FROM events WHERE id=?").run(id);
  revalidateAll();
  return ok("Kegiatan dihapus.");
}

// ---------- Panitia: item kebutuhan ----------

function parseTargetQty(targetLabel: string): number | null {
  const m = targetLabel.replace(",", ".").match(/^(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

export async function addItemAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  const eventId = Number(formData.get("event_id"));
  const name = String(formData.get("name") || "").trim().slice(0, 60);
  const targetLabel = String(formData.get("target_label") || "").trim().slice(0, 40);
  const unit = String(formData.get("unit") || "").trim().slice(0, 20);
  const note = String(formData.get("note") || "").trim().slice(0, 200);
  if (!name) return fail("Nama item wajib diisi.");
  if (!targetLabel) return fail("Target kebutuhan wajib diisi (mis. 40 Kg atau Secukupnya).");
  const targetQty = parseTargetQty(targetLabel);

  if (isSupabaseConfigured()) {
    const r = await sbAddItem({ eventId, name, targetQty, targetLabel, unit, note });
    revalidateAll();
    return r;
  }

  const { getDb } = await loadSqliteDb();
  const db = getDb();
  const max = (db.prepare("SELECT COALESCE(MAX(sort_order),0) AS m FROM items WHERE event_id=?").get(eventId) as { m: number }).m;
  db.prepare("INSERT INTO items (event_id,name,target_qty,target_label,unit,note,sort_order) VALUES (?,?,?,?,?,?,?)")
    .run(eventId, name, targetQty, targetLabel, unit, note, max + 1);
  revalidateAll();
  return ok("Item kebutuhan ditambahkan.");
}

export async function updateItemAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim().slice(0, 60);
  const targetLabel = String(formData.get("target_label") || "").trim().slice(0, 40);
  const unit = String(formData.get("unit") || "").trim().slice(0, 20);
  const note = String(formData.get("note") || "").trim().slice(0, 200);
  if (!name || !targetLabel) return fail("Nama dan target item wajib diisi.");
  const targetQty = parseTargetQty(targetLabel);

  if (isSupabaseConfigured()) {
    const r = await sbUpdateItem({ id, name, targetQty, targetLabel, unit, note });
    revalidateAll();
    return r;
  }

  const { getDb } = await loadSqliteDb();
  getDb().prepare("UPDATE items SET name=?, target_qty=?, target_label=?, unit=?, note=? WHERE id=?")
    .run(name, targetQty, targetLabel, unit, note, id);
  revalidateAll();
  return ok("Item diperbarui.");
}

export async function toggleItemOpenAction(id: number, isOpen: boolean): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  if (isSupabaseConfigured()) {
    const r = await sbToggleItemOpen(id, isOpen);
    revalidateAll();
    return r;
  }
  const { getDb } = await loadSqliteDb();
  getDb().prepare("UPDATE items SET is_open=? WHERE id=?").run(isOpen ? 1 : 0, id);
  revalidateAll();
  return ok(isOpen ? "Item dibuka kembali." : "Item ditandai terpenuhi.");
}

export async function deleteItemAction(id: number): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  if (isSupabaseConfigured()) {
    const r = await sbDeleteItem(id);
    revalidateAll();
    return r;
  }
  const { getDb } = await loadSqliteDb();
  getDb().prepare("DELETE FROM items WHERE id=?").run(id);
  revalidateAll();
  return ok("Item dihapus.");
}

// ---------- Panitia: keputusan pengajuan ----------

export async function decideSubmissionAction(id: number, decision: "approved" | "rejected", note: string): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  if (isSupabaseConfigured()) {
    const r = await sbDecideSubmission(id, decision, note);
    revalidateAll();
    return r;
  }

  const { getDb } = await loadSqliteDb();
  const db = getDb();
  const sub = db.prepare("SELECT * FROM submissions WHERE id=?").get(id) as { item_id: number; nickname: string; qty: number | null; qty_label: string } | undefined;
  if (!sub) return fail("Pengajuan tidak ditemukan.");
  db.prepare("UPDATE submissions SET status=?, decided_at=datetime('now'), decision_note=? WHERE id=?")
    .run(decision, note.slice(0, 300), id);

  if (decision === "approved") {
    const existing = db.prepare("SELECT 1 FROM fulfillments WHERE submission_id=?").get(id);
    if (!existing) {
      db.prepare("INSERT INTO fulfillments (item_id,submission_id,person_name,qty,qty_label) VALUES (?,?,?,?,?)")
        .run(sub.item_id, id, sub.nickname, sub.qty, sub.qty_label);
    }
  } else {
    db.prepare("DELETE FROM fulfillments WHERE submission_id=? AND received=0").run(id);
  }
  revalidateAll();
  return ok(decision === "approved" ? "Pengajuan disetujui." : "Pengajuan ditolak.");
}

// ---------- Panitia: barang & penanggung jawab ----------

export async function addFulfillmentAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  const itemId = Number(formData.get("item_id"));
  const personName = String(formData.get("person_name") || "").trim().slice(0, 40);
  const qtyRaw = String(formData.get("qty") || "").trim();
  const qtyLabel = String(formData.get("qty_label") || "").trim().slice(0, 40);
  const note = String(formData.get("note") || "").trim().slice(0, 200);
  if (!personName) return fail("Nama penanggung jawab / pembantu wajib diisi.");
  const item = await getItemById(itemId);
  if (!item) return fail("Item tidak ditemukan.");
  let qty: number | null = null;
  if (qtyRaw) {
    qty = Number(qtyRaw.replace(",", "."));
    if (!Number.isFinite(qty) || qty < 0) return fail("Jumlah tidak valid.");
  }
  const label = qtyLabel || (qty != null ? `${qty}${item.unit ? " " + item.unit : ""}` : "");

  if (isSupabaseConfigured()) {
    const r = await sbAddFulfillment({ itemId, personName, qty, label, note });
    revalidateAll();
    return r;
  }

  const { getDb } = await loadSqliteDb();
  getDb().prepare("INSERT INTO fulfillments (item_id,person_name,qty,qty_label,note) VALUES (?,?,?,?,?)")
    .run(itemId, personName, qty, label, note);
  revalidateAll();
  return ok("Data barang ditambahkan.");
}

export async function toggleReceivedAction(id: number, received: boolean): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  if (isSupabaseConfigured()) {
    const r = await sbToggleReceived(id, received);
    revalidateAll();
    return r;
  }
  const { getDb } = await loadSqliteDb();
  getDb().prepare("UPDATE fulfillments SET received=? WHERE id=?").run(received ? 1 : 0, id);
  revalidateAll();
  return ok(received ? "Barang ditandai diterima." : "Tanda diterima dibatalkan.");
}

export async function setPicAction(itemId: number, fulfillmentId: number): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  if (isSupabaseConfigured()) {
    const r = await sbSetPic(itemId, fulfillmentId);
    revalidateAll();
    return r;
  }
  const { getDb } = await loadSqliteDb();
  const db = getDb();
  db.prepare("UPDATE fulfillments SET is_pic=0 WHERE item_id=?").run(itemId);
  db.prepare("UPDATE fulfillments SET is_pic=1 WHERE id=? AND item_id=?").run(fulfillmentId, itemId);
  revalidateAll();
  return ok("Penanggung jawab ditetapkan.");
}

export async function deleteFulfillmentAction(id: number): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  if (isSupabaseConfigured()) {
    const r = await sbDeleteFulfillment(id);
    revalidateAll();
    return r;
  }
  const { getDb } = await loadSqliteDb();
  getDb().prepare("DELETE FROM fulfillments WHERE id=?").run(id);
  revalidateAll();
  return ok("Data barang dihapus.");
}

// ---------- Panitia: surplus / sisa barang ----------

export async function addSurplusAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  const eventId = Number(formData.get("event_id"));
  const itemIdRaw = String(formData.get("item_id") || "");
  const itemName = String(formData.get("item_name") || "").trim().slice(0, 60);
  const qtyRaw = String(formData.get("qty") || "").trim();
  const qtyLabel = String(formData.get("qty_label") || "").trim().slice(0, 40);
  const condition = String(formData.get("condition") || "sisa");
  const decision = String(formData.get("decision") || "disimpan");
  const decisionNote = String(formData.get("decision_note") || "").trim().slice(0, 300);
  const picName = String(formData.get("pic_name") || "").trim().slice(0, 40);
  const outcome = String(formData.get("outcome") || "").trim().slice(0, 300);
  if (!itemName) return fail("Nama barang wajib diisi.");

  let qty: number | null = null;
  if (qtyRaw) {
    qty = Number(qtyRaw.replace(",", "."));
    if (!Number.isFinite(qty) || qty < 0) return fail("Jumlah tidak valid.");
  }
  const itemId = itemIdRaw ? Number(itemIdRaw) : null;

  if (isSupabaseConfigured()) {
    const r = await sbAddSurplus({ eventId, itemId, itemName, qty, qtyLabel, condition, decision, decisionNote, picName, outcome });
    revalidateAll();
    return r;
  }

  const { getDb } = await loadSqliteDb();
  getDb()
    .prepare(
      `INSERT INTO surplus (event_id,item_id,item_name,qty,qty_label,condition,decision,decision_note,pic_name,outcome,resolved_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(eventId, itemId, itemName, qty, qtyLabel, condition, decision, decisionNote, picName, outcome, outcome ? new Date().toISOString().slice(0, 19).replace("T", " ") : null);
  revalidateAll();
  return ok("Catatan sisa barang disimpan. Riwayat tidak akan hilang.");
}

export async function updateSurplusAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  const id = Number(formData.get("id"));
  const decision = String(formData.get("decision") || "disimpan");
  const decisionNote = String(formData.get("decision_note") || "").trim().slice(0, 300);
  const picName = String(formData.get("pic_name") || "").trim().slice(0, 40);
  const outcome = String(formData.get("outcome") || "").trim().slice(0, 300);

  if (isSupabaseConfigured()) {
    const r = await sbUpdateSurplus({ id, decision, decisionNote, picName, outcome });
    revalidateAll();
    return r;
  }

  const { getDb } = await loadSqliteDb();
  getDb()
    .prepare("UPDATE surplus SET decision=?, decision_note=?, pic_name=?, outcome=?, resolved_at=? WHERE id=?")
    .run(decision, decisionNote, picName, outcome, outcome ? new Date().toISOString().slice(0, 19).replace("T", " ") : null, id);
  revalidateAll();
  return ok("Keputusan sisa barang diperbarui.");
}

export async function deleteSurplusAction(id: number): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  if (isSupabaseConfigured()) {
    const r = await sbDeleteSurplus(id);
    revalidateAll();
    return r;
  }
  const { getDb } = await loadSqliteDb();
  getDb().prepare("DELETE FROM surplus WHERE id=?").run(id);
  revalidateAll();
  return ok("Catatan dihapus.");
}

// ---------- Panitia: foto kegiatan ----------

export async function uploadPhotoAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  const eventId = Number(formData.get("event_id"));
  const caption = String(formData.get("caption") || "").trim().slice(0, 120);
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return fail("Pilih file foto terlebih dahulu.");
  if (file.size > 15 * 1024 * 1024) return fail("Ukuran foto maksimal 15 MB.");
  if (!file.type.startsWith("image/")) return fail("File harus berupa gambar.");

  if (isSupabaseConfigured()) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const r = await sbUploadPhoto(eventId, caption, bytes);
    revalidateAll();
    return r;
  }

  // Jalur SQLite (preview lokal): photon + filesystem, di-import lazy.
  try {
    const { compressToWebp } = await import("./photo");
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { getDb } = await loadSqliteDb();
    const input = new Uint8Array(await file.arrayBuffer());
    const compressed = await compressToWebp(input);
    const uploadDir = path.join(process.cwd(), "data", "uploads");
    fs.mkdirSync(uploadDir, { recursive: true });
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.webp`;
    fs.writeFileSync(path.join(uploadDir, name), compressed);
    getDb().prepare("INSERT INTO photos (event_id,file_path,caption) VALUES (?,?,?)").run(eventId, `/api/uploads/${name}`, caption);
    revalidateAll();
    return ok(`Foto diupload & dikompres otomatis (${Math.round(compressed.length / 1024)} KB).`);
  } catch {
    return fail("Gagal memproses foto. Pastikan file gambar valid.");
  }
}

export async function deletePhotoAction(id: number): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  if (isSupabaseConfigured()) {
    const r = await sbDeletePhoto(id);
    revalidateAll();
    return r;
  }

  const { getDb } = await loadSqliteDb();
  const fs = await import("node:fs");
  const path = await import("node:path");
  const db = getDb();
  const photo = db.prepare("SELECT * FROM photos WHERE id=?").get(id) as { file_path: string } | undefined;
  if (photo?.file_path.startsWith("/api/uploads/")) {
    const uploadDir = path.join(process.cwd(), "data", "uploads");
    const p = path.join(uploadDir, path.basename(photo.file_path));
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  db.prepare("DELETE FROM photos WHERE id=?").run(id);
  revalidateAll();
  return ok("Foto dihapus.");
}
