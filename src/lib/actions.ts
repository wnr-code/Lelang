"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { createSession, destroySession, isPanitia, newTrackCode, newProposalCode, slugify, verifyPassword } from "./auth";
import { getEventById, getItemById, getPanitiaWa } from "./queries";
import { checkSpam, bumpRate } from "./spam";
import { logStatus } from "./status-log";
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
  sbInsertPhoto,
  sbDeletePhoto,
  sbSubmitProposal,
  sbDecideProposal,
  sbUpdateProposal,
  sbSetPanitiaWa,
} from "./supabase-actions";
import { isWorkerd } from "./storage";
import { SUBMISSION_DECISIONS, SURPLUS_DECISION_LABEL } from "./types";
import type { SubmissionStatus, SurplusDecision, ItemCategory, ProposalStatus } from "./types";

const DECISION_MESSAGE: Record<SubmissionStatus, string> = {
  pending: "Pengajuan dikembalikan ke daftar tunggu.",
  approved: "Pengajuan disetujui. Catat penerimaan di menu Kelola Barang.",
  needs_confirmation: "Pengajuan ditandai perlu konfirmasi. Hubungi anggota lewat WhatsApp.",
  rejected: "Pengajuan ditolak.",
  done: "Pengajuan selesai — bantuan tercatat sudah diterima.",
};

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
  const nickname = String(formData.get("nickname") || "").trim().slice(0, 80);
  const qtyRaw = String(formData.get("qty") || "").trim();
  const qtyLabel = String(formData.get("qty_label") || "").trim().slice(0, 80);
  const message = String(formData.get("message") || "").trim().slice(0, 2000);
  const contact = String(formData.get("contact") || "").trim().slice(0, 80);
  const unit = String(formData.get("unit") || "").trim().slice(0, 30);
  const availability = String(formData.get("availability") || "").trim().slice(0, 150);

  if (!nickname) return fail("Nama panggilan wajib diisi.");
  if (!contact) return fail("Nomor WhatsApp wajib diisi agar panitia bisa follow up.");
  const contactDigits = contact.replace(/\D/g, "");
  if (contactDigits.length < 9 || contactDigits.length > 15) return fail("Nomor WhatsApp tidak valid. Contoh: 0812xxxx.");
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
  const isTenaga = item.kind === "tenaga";
  if (isTenaga) {
    if (!availability) return fail("Waktu ketersediaan wajib diisi (mis. Sabtu, 07.00–12.00 WIB).");
  } else if (qty == null && !qtyLabel) {
    return fail("Isi jumlah kesediaan (angka atau keterangan singkat).");
  }

  const finalUnit = unit || item.unit || "";
  const label =
    qtyLabel ||
    (qty != null ? `${qty}${finalUnit ? " " + finalUnit : ""}` : isTenaga ? "Siap membantu" : "");

  const spam = await checkSpam(formData, "infaq", contact);
  if (!spam.ok) return fail(spam.error);

  if (isSupabaseConfigured()) {
    const r = await sbSubmitHelp({ eventId: item.event_id, itemId, nickname, qty, label, message, contact, unit: finalUnit, availability });
    if (r.ok && r.id) {
      await bumpRate(spam.key);
      await logStatus("submission", r.id, "pending", "Pengajuan infaq dikirim anggota.", "anggota");
    }
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
      `INSERT INTO submissions (event_id,item_id,nickname,qty,qty_label,unit,availability,message,contact,status,track_code)
       VALUES (?,?,?,?,?,?,?,?,?,'pending',?)`
    )
    .run(item.event_id, itemId, nickname, qty, label, finalUnit, availability, message, contact, code);

  const newId = Number(res.lastInsertRowid);
  await bumpRate(spam.key);
  await logStatus("submission", newId, "pending", "Pengajuan infaq dikirim anggota.", "anggota");
  revalidatePath(`/kegiatan/${event.slug}`);
  revalidatePath("/panitia/pengajuan");
  return ok("Pengajuan terkirim! Simpan kode lacakmu.", { code, id: newId });
}


// ---------- Publik: usulan item baru ----------

export async function submitProposalAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const eventId = Number(formData.get("event_id"));
  const name = String(formData.get("name") || "").trim().slice(0, 100);
  const nickname = String(formData.get("nickname") || "").trim().slice(0, 80);
  const qtyRaw = String(formData.get("qty") || "").trim();
  const qtyLabel = String(formData.get("qty_label") || "").trim().slice(0, 80);
  const unit = String(formData.get("unit") || "").trim().slice(0, 30);
  const note = String(formData.get("note") || "").trim().slice(0, 1000);
  const contact = String(formData.get("contact") || "").trim().slice(0, 80);
  const category = parseCategory(formData);

  if (!name) return fail("Nama barang yang diusulkan wajib diisi.");
  if (!nickname) return fail("Nama panggilan wajib diisi.");
  const event = await getEventById(eventId);
  if (!event || event.status !== "active") return fail("Kegiatan ini sudah tidak menerima usulan.");
  if (contact) {
    const d = contact.replace(/\D/g, "");
    if (d.length < 9 || d.length > 15) return fail("Nomor WhatsApp tidak valid. Contoh: 0812xxxx.");
  }
  let qty: number | null = null;
  if (qtyRaw) {
    qty = Number(qtyRaw.replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0) return fail("Jumlah usulan tidak valid.");
  }
  const label = qtyLabel || (qty != null ? `${qty}${unit ? " " + unit : ""}` : "");

  const spam = await checkSpam(formData, "usulan", contact || nickname);
  if (!spam.ok) return fail(spam.error);

  if (isSupabaseConfigured()) {
    const r = await sbSubmitProposal({ eventId, name, qty, qtyLabel: label, unit, category, nickname, contact, note });
    if (r.ok && r.id) {
      await bumpRate(spam.key);
      await logStatus("proposal", r.id, "pending", "Usulan item baru dikirim anggota.", "anggota");
    }
    revalidatePath(`/kegiatan/${event.slug}`);
    revalidatePath("/panitia/usulan");
    return r;
  }

  const { getDb } = await loadSqliteDb();
  const db = getDb();
  let code = newProposalCode();
  while (db.prepare("SELECT 1 FROM item_proposals WHERE track_code = ?").get(code)) code = newProposalCode();
  const res = db
    .prepare(
      `INSERT INTO item_proposals (event_id,name,qty,qty_label,unit,category,nickname,contact,note,status,track_code)
       VALUES (?,?,?,?,?,?,?,?,?,'pending',?)`
    )
    .run(eventId, name, qty, label, unit, category, nickname, contact, note, code);
  const newId = Number(res.lastInsertRowid);
  await bumpRate(spam.key);
  await logStatus("proposal", newId, "pending", "Usulan item baru dikirim anggota.", "anggota");
  revalidatePath(`/kegiatan/${event.slug}`);
  revalidatePath("/panitia/usulan");
  return ok("Usulan terkirim! Menunggu persetujuan panitia.", { code, id: newId });
}

// ---------- Panitia: usulan item baru ----------

export async function updateProposalAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim().slice(0, 100);
  const qtyRaw = String(formData.get("qty") || "").trim();
  const qtyLabel = String(formData.get("qty_label") || "").trim().slice(0, 80);
  const unit = String(formData.get("unit") || "").trim().slice(0, 30);
  const note = String(formData.get("note") || "").trim().slice(0, 1000);
  const category = parseCategory(formData);
  if (!name) return fail("Nama usulan wajib diisi.");
  let qty: number | null = null;
  if (qtyRaw) {
    qty = Number(qtyRaw.replace(",", "."));
    if (!Number.isFinite(qty) || qty < 0) return fail("Jumlah tidak valid.");
  }
  const label = qtyLabel || (qty != null ? `${qty}${unit ? " " + unit : ""}` : "");

  if (isSupabaseConfigured()) {
    const r = await sbUpdateProposal({ id, name, qty, qtyLabel: label, unit, category, note });
    if (r.ok) await logStatus("proposal", id, "pending", "Usulan diubah oleh panitia.", "panitia");
    revalidateAll();
    return r;
  }
  const { getDb } = await loadSqliteDb();
  getDb()
    .prepare("UPDATE item_proposals SET name=?, qty=?, qty_label=?, unit=?, category=?, note=? WHERE id=?")
    .run(name, qty, label, unit, category, note, id);
  await logStatus("proposal", id, "pending", "Usulan diubah oleh panitia.", "panitia");
  revalidateAll();
  return ok("Usulan diperbarui.");
}

export async function decideProposalAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  const id = Number(formData.get("id"));
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 300);
  if (decision !== "approved" && decision !== "rejected") return fail("Keputusan tidak valid.");

  // Override opsional saat menyetujui (admin boleh mengubah usulan).
  const name = String(formData.get("name") || "").trim().slice(0, 100) || undefined;
  const targetLabel = String(formData.get("target_label") || "").trim().slice(0, 80) || undefined;
  const unit = String(formData.get("unit") || "").trim().slice(0, 30) || undefined;
  const noteItem = String(formData.get("note_item") || "").trim().slice(0, 1000) || undefined;
  const catRaw = String(formData.get("category") || "");
  const category = (["sembako", "barang", "tenaga", "lainnya"].includes(catRaw) ? catRaw : undefined) as ItemCategory | undefined;

  if (isSupabaseConfigured()) {
    const r = await sbDecideProposal({ id, decision, note, name, targetLabel, unit, category, noteItem });
    if (r.ok) await logStatus("proposal", id, decision, note || (decision === "approved" ? "Usulan disetujui & jadi kebutuhan resmi." : "Usulan ditolak."), "panitia");
    revalidateAll();
    return r;
  }

  const { getDb } = await loadSqliteDb();
  const db = getDb();
  const prop = db.prepare("SELECT * FROM item_proposals WHERE id=?").get(id) as Record<string, unknown> | undefined;
  if (!prop) return fail("Usulan tidak ditemukan.");
  if (prop.status !== "pending") return fail("Usulan ini sudah diputuskan sebelumnya.");

  let approvedItemId: number | null = null;
  if (decision === "approved") {
    const cat = (category ?? String(prop.category)) as ItemCategory;
    const kind = cat === "tenaga" ? "tenaga" : "barang";
    const itemName = (name ?? String(prop.name)).slice(0, 100);
    const itemUnit = (unit ?? String(prop.unit ?? "")).slice(0, 30);
    const qty = prop.qty == null ? null : Number(prop.qty);
    const qtyLabel = String(prop.qty_label ?? "");
    const tLabel = (targetLabel ?? (qtyLabel || (qty != null ? `${qty}${itemUnit ? " " + itemUnit : ""}` : "Secukupnya"))).slice(0, 80);
    const tQty = parseTargetQty(tLabel);
    const max = (db.prepare("SELECT COALESCE(MAX(sort_order),0) AS m FROM items WHERE event_id=?").get(Number(prop.event_id)) as { m: number }).m;
    const ins = db
      .prepare("INSERT INTO items (event_id,name,target_qty,target_label,unit,note,sort_order,kind,category) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(Number(prop.event_id), itemName, tQty, tLabel, itemUnit, (noteItem ?? String(prop.note ?? "")).slice(0, 1000), max + 1, kind, cat);
    approvedItemId = Number(ins.lastInsertRowid);
  }
  db.prepare("UPDATE item_proposals SET status=?, decided_at=datetime('now'), decision_note=?, approved_item_id=? WHERE id=?")
    .run(decision, note, approvedItemId, id);
  await logStatus("proposal", id, decision, note || (decision === "approved" ? "Usulan disetujui & jadi kebutuhan resmi." : "Usulan ditolak."), "panitia");
  revalidateAll();
  return ok(decision === "approved" ? "Usulan disetujui & menjadi kebutuhan resmi." : "Usulan ditolak.", { id: approvedItemId ?? undefined });
}

// ---------- Panitia: pengaturan WhatsApp ----------

export async function setPanitiaWaAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  const raw = String(formData.get("panitia_wa") || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits && (digits.length < 9 || digits.length > 15)) return fail("Nomor WhatsApp tidak valid. Contoh: 0812xxxx atau 62812xxxx.");
  let wa = digits;
  if (wa.startsWith("0")) wa = "62" + wa.slice(1);
  if (isSupabaseConfigured()) {
    const r = await sbSetPanitiaWa(wa);
    revalidateAll();
    return r;
  }
  const { getDb } = await loadSqliteDb();
  getDb().prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('panitia_wa', ?)").run(wa);
  revalidateAll();
  return ok("Nomor WhatsApp panitia disimpan.");
}

// ---------- Panitia: kegiatan ----------

export async function createEventAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  const title = String(formData.get("title") || "").trim().slice(0, 150);
  const description = String(formData.get("description") || "").trim().slice(0, 4000);
  const eventDate = String(formData.get("event_date") || "").trim();
  const location = String(formData.get("location") || "").trim().slice(0, 150);
  const eventTime = parseEventTime(formData);
  if (!title) return fail("Nama kegiatan wajib diisi.");

  if (isSupabaseConfigured()) {
    const r = await sbCreateEvent({ title, description, eventDate, location, eventTime });
    revalidateAll();
    return r;
  }

  const { getDb } = await loadSqliteDb();
  const db = getDb();
  let slug = slugify(title);
  while (db.prepare("SELECT 1 FROM events WHERE slug = ?").get(slug)) slug = `${slug}-${crypto.randomBytes(2).toString("hex")}`;
  const res = db
    .prepare("INSERT INTO events (slug,title,description,event_date,location,status,event_time) VALUES (?,?,?,?,?,'draft',?)")
    .run(slug, title, description, eventDate || null, location, eventTime);
  revalidateAll();
  return ok("Kegiatan dibuat sebagai draft.", { id: Number(res.lastInsertRowid) });
}

export async function updateEventAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") || "").trim().slice(0, 150);
  const description = String(formData.get("description") || "").trim().slice(0, 4000);
  const eventDate = String(formData.get("event_date") || "").trim();
  const location = String(formData.get("location") || "").trim().slice(0, 150);
  const eventTime = parseEventTime(formData);
  if (!title) return fail("Nama kegiatan wajib diisi.");

  if (isSupabaseConfigured()) {
    const r = await sbUpdateEvent({ id, title, description, eventDate, location, eventTime });
    revalidateAll();
    return r;
  }

  const { getDb } = await loadSqliteDb();
  getDb()
    .prepare("UPDATE events SET title=?, description=?, event_date=?, location=?, event_time=? WHERE id=?")
    .run(title, description, eventDate || null, location, eventTime, id);
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

function parseCategory(formData: FormData): ItemCategory {
  const raw = String(formData.get("category") || formData.get("kind") || "barang");
  if (raw === "tenaga" || raw === "sembako" || raw === "lainnya") return raw;
  return "barang";
}

/** Jam acara "HH:MM" (24 jam). Kosong = belum ditentukan. */
function parseEventTime(formData: FormData): string | null {
  const raw = String(formData.get("event_time") || "").trim();
  const m = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function parseTargetQty(targetLabel: string): number | null {
  const m = targetLabel.replace(",", ".").match(/^(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

export async function addItemAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  const eventId = Number(formData.get("event_id"));
  const name = String(formData.get("name") || "").trim().slice(0, 100);
  const targetLabel = String(formData.get("target_label") || "").trim().slice(0, 80);
  const unit = String(formData.get("unit") || "").trim().slice(0, 30);
  const note = String(formData.get("note") || "").trim().slice(0, 1000);
  const category = parseCategory(formData);
  const kind = category === "tenaga" ? "tenaga" : "barang";
  if (!name) return fail("Nama item wajib diisi.");
  if (!targetLabel) return fail("Target kebutuhan wajib diisi (mis. 40 Kg atau Secukupnya).");
  const targetQty = parseTargetQty(targetLabel);

  if (isSupabaseConfigured()) {
    const r = await sbAddItem({ eventId, name, targetQty, targetLabel, unit, note, kind, category });
    revalidateAll();
    return r;
  }

  const { getDb } = await loadSqliteDb();
  const db = getDb();
  const max = (db.prepare("SELECT COALESCE(MAX(sort_order),0) AS m FROM items WHERE event_id=?").get(eventId) as { m: number }).m;
  db.prepare("INSERT INTO items (event_id,name,target_qty,target_label,unit,note,sort_order,kind,category) VALUES (?,?,?,?,?,?,?,?,?)")
    .run(eventId, name, targetQty, targetLabel, unit, note, max + 1, kind, category);
  revalidateAll();
  return ok(kind === "tenaga" ? "Kebutuhan tenaga ditambahkan." : "Item kebutuhan ditambahkan.");
}

export async function updateItemAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim().slice(0, 100);
  const targetLabel = String(formData.get("target_label") || "").trim().slice(0, 80);
  const unit = String(formData.get("unit") || "").trim().slice(0, 30);
  const note = String(formData.get("note") || "").trim().slice(0, 1000);
  const category = parseCategory(formData);
  const kind = category === "tenaga" ? "tenaga" : "barang";
  if (!name || !targetLabel) return fail("Nama dan target item wajib diisi.");
  const targetQty = parseTargetQty(targetLabel);

  if (isSupabaseConfigured()) {
    const r = await sbUpdateItem({ id, name, targetQty, targetLabel, unit, note, kind, category });
    revalidateAll();
    return r;
  }

  const { getDb } = await loadSqliteDb();
  getDb().prepare("UPDATE items SET name=?, target_qty=?, target_label=?, unit=?, note=?, kind=?, category=? WHERE id=?")
    .run(name, targetQty, targetLabel, unit, note, kind, category, id);
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

export async function decideSubmissionAction(id: number, decision: SubmissionStatus, note: string): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  if (!SUBMISSION_DECISIONS.includes(decision)) return fail("Status keputusan tidak valid.");
  if (isSupabaseConfigured()) {
    const r = await sbDecideSubmission(id, decision, note);
    if (r.ok) await logStatus("submission", id, decision, note || DECISION_MESSAGE[decision], "panitia");
    revalidateAll();
    return r;
  }

  const { getDb } = await loadSqliteDb();
  const db = getDb();
  const sub = db.prepare("SELECT * FROM submissions WHERE id=?").get(id) as { item_id: number; nickname: string; qty: number | null; qty_label: string } | undefined;
  if (!sub) return fail("Pengajuan tidak ditemukan.");
  db.prepare("UPDATE submissions SET status=?, decided_at=datetime('now'), decision_note=? WHERE id=?")
    .run(decision, note.slice(0, 1000), id);

  const existing = db.prepare("SELECT id FROM fulfillments WHERE submission_id=?").get(id) as { id: number } | undefined;
  if (decision === "approved") {
    // Disetujui = kesediaan dicatat, BELUM diterima. Verifikasi tetap di menu Barang.
    if (!existing) {
      db.prepare("INSERT INTO fulfillments (item_id,submission_id,person_name,qty,qty_label) VALUES (?,?,?,?,?)")
        .run(sub.item_id, id, sub.nickname, sub.qty, sub.qty_label);
    }
  } else if (decision === "rejected") {
    db.prepare("DELETE FROM fulfillments WHERE submission_id=? AND received=0").run(id);
  } else if (decision === "done") {
    // Selesai = panitia sudah memverifikasi penerimaan.
    if (!existing) {
      db.prepare("INSERT INTO fulfillments (item_id,submission_id,person_name,qty,qty_label,received,received_at) VALUES (?,?,?,?,?,1,datetime('now'))")
        .run(sub.item_id, id, sub.nickname, sub.qty, sub.qty_label);
    } else {
      db.prepare("UPDATE fulfillments SET received=1, received_at=COALESCE(received_at, datetime('now')) WHERE id=?").run(existing.id);
    }
  }
  await logStatus("submission", id, decision, note || DECISION_MESSAGE[decision], "panitia");
  revalidateAll();
  return ok(DECISION_MESSAGE[decision]);
}

// ---------- Panitia: barang & penanggung jawab ----------

export async function addFulfillmentAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  if (!(await guard())) return fail("Sesi panitia berakhir. Silakan login ulang.");
  const itemId = Number(formData.get("item_id"));
  const personName = String(formData.get("person_name") || "").trim().slice(0, 80);
  const qtyRaw = String(formData.get("qty") || "").trim();
  const qtyLabel = String(formData.get("qty_label") || "").trim().slice(0, 80);
  const note = String(formData.get("note") || "").trim().slice(0, 1000);
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
  const db = getDb();
  const f = db.prepare("SELECT submission_id FROM fulfillments WHERE id=?").get(id) as { submission_id: number | null } | undefined;
  db.prepare("UPDATE fulfillments SET received=?, received_at=? WHERE id=?")
    .run(received ? 1 : 0, received ? new Date().toISOString().slice(0, 19).replace("T", " ") : null, id);
  if (f?.submission_id) {
    db.prepare("UPDATE submissions SET status=? WHERE id=? AND status IN ('approved','done')")
      .run(received ? "done" : "approved", f.submission_id);
    await logStatus("submission", f.submission_id, received ? "done" : "approved", received ? "Penerimaan barang diverifikasi panitia." : "Tanda diterima dibatalkan panitia.", "panitia");
  }
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
  const itemName = String(formData.get("item_name") || "").trim().slice(0, 100);
  const qtyRaw = String(formData.get("qty") || "").trim();
  const qtyLabel = String(formData.get("qty_label") || "").trim().slice(0, 80);
  const condition = String(formData.get("condition") || "sisa");
  const decision = String(formData.get("decision") || "disimpan");
  const decisionNote = String(formData.get("decision_note") || "").trim().slice(0, 1000);
  const picName = String(formData.get("pic_name") || "").trim().slice(0, 80);
  const outcome = String(formData.get("outcome") || "").trim().slice(0, 1000);
  if (!itemName) return fail("Nama barang wajib diisi.");
  if (!SURPLUS_DECISION_LABEL[decision as SurplusDecision]) return fail("Pilihan pengelolaan sisa tidak valid.");

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
  const decisionNote = String(formData.get("decision_note") || "").trim().slice(0, 1000);
  const picName = String(formData.get("pic_name") || "").trim().slice(0, 80);
  const outcome = String(formData.get("outcome") || "").trim().slice(0, 1000);
  if (!SURPLUS_DECISION_LABEL[decision as SurplusDecision]) return fail("Pilihan pengelolaan sisa tidak valid.");

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
  const caption = String(formData.get("caption") || "").trim().slice(0, 500);
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return fail("Pilih file foto terlebih dahulu.");
  if (file.size > 2 * 1024 * 1024) return fail("Ukuran foto maksimal 2 MB. Foto dikompres otomatis di HP; jika masih besar, pilih foto lain.");
  const looksLikeImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
  if (!looksLikeImage) return fail("File harus berupa gambar (JPG, PNG, atau WebP).");
  const event = await getEventById(eventId);
  if (!event) return fail("Kegiatan tidak ditemukan.");

  try {
    const { compressToWebp } = await import("./photo");
    const input = new Uint8Array(await file.arrayBuffer());
    const compressed = await compressToWebp(input);
    let filePath: string;
    if (isWorkerd()) {
      // Produksi: simpan durabel di Cloudflare R2 (bucket liqo).
      const { putPhoto } = await import("./storage");
      const key = `${eventId}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.webp`;
      await putPhoto(key, compressed);
      filePath = `/api/foto/${key}`;
    } else {
      // Preview lokal: filesystem.
      const fs = await import("node:fs");
      const path = await import("node:path");
      const uploadDir = path.join(process.cwd(), "data", "uploads");
      fs.mkdirSync(uploadDir, { recursive: true });
      const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.webp`;
      fs.writeFileSync(path.join(uploadDir, name), compressed);
      filePath = `/api/uploads/${name}`;
    }
    if (isSupabaseConfigured()) {
      const r = await sbInsertPhoto(eventId, caption, filePath);
      revalidateAll();
      return r;
    }
    const { getDb } = await loadSqliteDb();
    getDb().prepare("INSERT INTO photos (event_id,file_path,caption) VALUES (?,?,?)").run(eventId, filePath, caption);
    revalidateAll();
    return ok(`Foto diupload & dikompres otomatis (${Math.round(compressed.length / 1024)} KB).`);
  } catch (e) {
    console.error("uploadPhoto", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/binding r2|bucket/i.test(msg)) {
      return fail("Penyimpanan foto belum siap. Hubungi pengelola untuk memasang R2 bucket `liqo` (binding `Lelang`).");
    }
    if (/unsupported|mime|format|decode|invalid|signature/i.test(msg)) {
      return fail("Format foto tidak didukung. Gunakan JPG, PNG, atau WebP.");
    }
    if (/size|large|payload|entity|too big/i.test(msg)) {
      return fail("Foto terlalu besar. Maksimal 2 MB.");
    }
    return fail("Gagal memproses foto. Gunakan JPG/PNG/WebP yang valid, maks. 2 MB.");
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
