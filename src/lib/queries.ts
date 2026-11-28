// Lapisan data dual-mode:
//  - Supabase (PostgreSQL) bila SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY diisi
//    (dipakai di produksi / Cloudflare Worker).
//  - SQLite (node:sqlite) bila belum dikonfigurasi (preview lokal / sandbox).
//    Modul SQLite di-import secara lazy agar tidak dievaluasi di Worker.
// Semua fungsi async; pemanggil melakukan `await`.
import { isSupabaseConfigured, loadSqliteDb } from "./supabase";
import {
  sbGetActiveEvents,
  sbGetArchivedEvents,
  sbGetAllEvents,
  sbGetEventBySlug,
  sbGetEventById,
  sbGetItemById,
  sbGetItemsWithStatus,
  sbGetFulfillments,
  sbGetFulfillmentsWithContact,
  sbGetFulfillmentsForEvent,
  sbGetSubmissions,
  sbGetSubmissionByCode,
  sbGetSurplus,
  sbGetPhotos,
  sbGetDashboardCounts,
  sbGetProposals,
  sbGetProposalByCode,
  sbGetPanitiaWa,
  type SubmissionJoined,
  type SubmissionTracked,
  type ProposalJoined,
} from "./supabase-queries";
import { computeItemsWithStatus, deriveItemStatus, fmtQty } from "./item-status";
import type {
  EventRow,
  ItemRow,
  ItemWithStatus,
  FulfillmentRow,
  FulfillmentWithContact,
  SurplusRow,
  PhotoRow,
} from "./types";

export { deriveItemStatus, fmtQty };
export type { SubmissionJoined, SubmissionTracked, ProposalJoined };

export async function getActiveEvents(): Promise<EventRow[]> {
  if (isSupabaseConfigured()) return sbGetActiveEvents();
  const { getDb } = await loadSqliteDb();
  return getDb()
    .prepare("SELECT * FROM events WHERE status = 'active' ORDER BY event_date IS NULL, event_date ASC, id DESC")
    .all() as unknown as EventRow[];
}

export async function getArchivedEvents(): Promise<EventRow[]> {
  if (isSupabaseConfigured()) return sbGetArchivedEvents();
  const { getDb } = await loadSqliteDb();
  return getDb()
    .prepare("SELECT * FROM events WHERE status IN ('completed','archived') ORDER BY completed_at DESC, event_date DESC")
    .all() as unknown as EventRow[];
}

export async function getAllEvents(): Promise<EventRow[]> {
  if (isSupabaseConfigured()) return sbGetAllEvents();
  const { getDb } = await loadSqliteDb();
  return getDb()
    .prepare("SELECT * FROM events ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END, event_date DESC, id DESC")
    .all() as unknown as EventRow[];
}

export async function getEventBySlug(slug: string): Promise<EventRow | undefined> {
  if (isSupabaseConfigured()) return sbGetEventBySlug(slug);
  const { getDb } = await loadSqliteDb();
  return getDb().prepare("SELECT * FROM events WHERE slug = ?").get(slug) as unknown as EventRow | undefined;
}

export async function getEventById(id: number): Promise<EventRow | undefined> {
  if (isSupabaseConfigured()) return sbGetEventById(id);
  const { getDb } = await loadSqliteDb();
  return getDb().prepare("SELECT * FROM events WHERE id = ?").get(id) as unknown as EventRow | undefined;
}

export async function getItemsWithStatus(eventId: number): Promise<ItemWithStatus[]> {
  if (isSupabaseConfigured()) return sbGetItemsWithStatus(eventId);
  const { getDb } = await loadSqliteDb();
  const db = getDb();
  const items = db
    .prepare("SELECT * FROM items WHERE event_id = ? ORDER BY sort_order ASC, id ASC")
    .all(eventId) as unknown as ItemRow[];
  const fulfillments = db
    .prepare("SELECT f.* FROM fulfillments f JOIN items i ON i.id = f.item_id WHERE i.event_id = ?")
    .all(eventId) as unknown as FulfillmentRow[];
  const submissions = db
    .prepare("SELECT * FROM submissions WHERE event_id = ?")
    .all(eventId) as unknown as import("./types").SubmissionRow[];
  return computeItemsWithStatus(items, fulfillments, submissions);
}

export async function getItemById(id: number): Promise<ItemRow | undefined> {
  if (isSupabaseConfigured()) return sbGetItemById(id);
  const { getDb } = await loadSqliteDb();
  return getDb().prepare("SELECT * FROM items WHERE id = ?").get(id) as unknown as ItemRow | undefined;
}

export async function getFulfillments(itemId: number): Promise<FulfillmentRow[]> {
  if (isSupabaseConfigured()) return sbGetFulfillments(itemId);
  const { getDb } = await loadSqliteDb();
  return getDb()
    .prepare("SELECT * FROM fulfillments WHERE item_id = ? ORDER BY is_pic DESC, id ASC")
    .all(itemId) as unknown as FulfillmentRow[];
}
export async function getFulfillmentsWithContact(itemId: number): Promise<FulfillmentWithContact[]> {
  if (isSupabaseConfigured()) return sbGetFulfillmentsWithContact(itemId);
  const { getDb } = await loadSqliteDb();
  return getDb()
    .prepare(
      `SELECT f.*, COALESCE(s.contact, '') AS contact, COALESCE(s.track_code, '') AS track_code, s.status AS submission_status
       FROM fulfillments f LEFT JOIN submissions s ON s.id = f.submission_id
       WHERE f.item_id = ? ORDER BY f.is_pic DESC, f.id ASC`
    )
    .all(itemId) as unknown as FulfillmentWithContact[];
}

export async function getFulfillmentsForEvent(eventId: number): Promise<FulfillmentRow[]> {
  if (isSupabaseConfigured()) return sbGetFulfillmentsForEvent(eventId);
  const { getDb } = await loadSqliteDb();
  return getDb()
    .prepare("SELECT f.* FROM fulfillments f JOIN items i ON i.id = f.item_id WHERE i.event_id = ? ORDER BY i.sort_order, f.id")
    .all(eventId) as unknown as FulfillmentRow[];
}

export async function getSubmissions(eventId?: number, status?: string): Promise<SubmissionJoined[]> {
  if (isSupabaseConfigured()) return sbGetSubmissions(eventId, status);
  const { getDb } = await loadSqliteDb();
  const db = getDb();
  const where: string[] = [];
  const params: Array<number | string> = [];
  if (eventId) {
    where.push("s.event_id = ?");
    params.push(eventId);
  }
  if (status && status !== "all") {
    where.push("s.status = ?");
    params.push(status);
  }
  const sql = `
    SELECT s.*, i.name AS item_name, i.kind AS item_kind, e.title AS event_title, e.slug AS event_slug
    FROM submissions s
    JOIN items i ON i.id = s.item_id
    JOIN events e ON e.id = s.event_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY CASE s.status WHEN 'pending' THEN 0 WHEN 'needs_confirmation' THEN 1 ELSE 2 END, s.created_at DESC, s.id DESC`;
  return db.prepare(sql).all(...params) as unknown as SubmissionJoined[];
}

export async function getSubmissionByCode(code: string): Promise<SubmissionTracked | undefined> {
  if (isSupabaseConfigured()) return sbGetSubmissionByCode(code);
  const { getDb } = await loadSqliteDb();
  return getDb()
    .prepare(
      `SELECT s.*, i.name AS item_name, i.kind AS item_kind, i.target_label, i.unit AS item_unit, e.title AS event_title, e.slug AS event_slug, e.status AS event_status,
              COALESCE((SELECT person_name FROM fulfillments f WHERE f.submission_id = s.id AND f.is_pic = 1 LIMIT 1), '') AS pic_name
       FROM submissions s
       JOIN items i ON i.id = s.item_id
       JOIN events e ON e.id = s.event_id
       WHERE s.track_code = ?`
    )
    .get(code) as unknown as SubmissionTracked | undefined;
}

export async function getSurplus(eventId: number): Promise<SurplusRow[]> {
  if (isSupabaseConfigured()) return sbGetSurplus(eventId);
  const { getDb } = await loadSqliteDb();
  return getDb()
    .prepare("SELECT * FROM surplus WHERE event_id = ? ORDER BY id ASC")
    .all(eventId) as unknown as SurplusRow[];
}

export async function getPhotos(eventId: number): Promise<PhotoRow[]> {
  if (isSupabaseConfigured()) return sbGetPhotos(eventId);
  const { getDb } = await loadSqliteDb();
  return getDb()
    .prepare("SELECT * FROM photos WHERE event_id = ? ORDER BY id ASC")
    .all(eventId) as unknown as PhotoRow[];
}

export async function getEventProgress(eventId: number): Promise<{ total: number; fulfilled: number }> {
  const items = await getItemsWithStatus(eventId);
  return { total: items.length, fulfilled: items.filter((i) => i.status === "fulfilled").length };
}

export async function getDashboardCounts(): Promise<{
  pending: number;
  active: number;
  archived: number;
  unresolvedSurplus: number;
  members: number;
  items: number;
  proposalsPending: number;
}> {
  if (isSupabaseConfigured()) return sbGetDashboardCounts();
  const { getDb } = await loadSqliteDb();
  const db = getDb();
  const pending = (db.prepare("SELECT COUNT(*) AS c FROM submissions WHERE status = 'pending'").get() as { c: number }).c;
  const active = (db.prepare("SELECT COUNT(*) AS c FROM events WHERE status = 'active'").get() as { c: number }).c;
  const archived = (db.prepare("SELECT COUNT(*) AS c FROM events WHERE status IN ('completed','archived')").get() as { c: number }).c;
  const unresolvedSurplus = (db.prepare("SELECT COUNT(*) AS c FROM surplus WHERE outcome = ''").get() as { c: number }).c;
  const members = (db.prepare("SELECT COUNT(DISTINCT nickname) AS c FROM submissions").get() as { c: number }).c;
  const items = (db.prepare("SELECT COUNT(*) AS c FROM items").get() as { c: number }).c;
  const proposalsPending = (db.prepare("SELECT COUNT(*) AS c FROM item_proposals WHERE status = 'pending'").get() as { c: number }).c;
  return { pending, active, archived, unresolvedSurplus, members, items, proposalsPending };
}

// ---------- Usulan item baru (proposal) ----------

export async function getProposals(eventId?: number, status?: string): Promise<ProposalJoined[]> {
  if (isSupabaseConfigured()) return sbGetProposals(eventId, status);
  const { getDb } = await loadSqliteDb();
  const db = getDb();
  const where: string[] = [];
  const params: Array<number | string> = [];
  if (eventId) { where.push("p.event_id = ?"); params.push(eventId); }
  if (status && status !== "all") { where.push("p.status = ?"); params.push(status); }
  const sql = `
    SELECT p.*, e.title AS event_title, e.slug AS event_slug
    FROM item_proposals p JOIN events e ON e.id = p.event_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY CASE p.status WHEN 'pending' THEN 0 ELSE 1 END, p.created_at DESC, p.id DESC`;
  return db.prepare(sql).all(...params) as unknown as ProposalJoined[];
}

export async function getProposalByCode(code: string): Promise<ProposalJoined | undefined> {
  if (isSupabaseConfigured()) return sbGetProposalByCode(code);
  const { getDb } = await loadSqliteDb();
  return getDb()
    .prepare(
      `SELECT p.*, e.title AS event_title, e.slug AS event_slug
       FROM item_proposals p JOIN events e ON e.id = p.event_id WHERE p.track_code = ?`
    )
    .get(code) as unknown as ProposalJoined | undefined;
}

/** Nomor WhatsApp panitia untuk tombol konfirmasi (disetel di Pengaturan panitia). */
export async function getPanitiaWa(): Promise<string> {
  if (isSupabaseConfigured()) return sbGetPanitiaWa();
  const { getDb } = await loadSqliteDb();
  const row = getDb().prepare("SELECT value FROM app_settings WHERE key = 'panitia_wa'").get() as { value: string } | undefined;
  return row?.value || "";
}
