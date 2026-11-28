import "server-only";
// Mutasi pengajuan/pemenuhan yang atomik & konsisten (SQLite transaksi; Supabase RPC).
// Invarian: approved/done punya tepat satu fulfillment; approved=belum diterima, done=diterima fisik.
import { isSupabaseConfigured, loadSqliteDb, getSupabase, throwIfError } from "./supabase";
import { resolveTransition, type SubmissionAction } from "./submission-flow";
import type { SubmissionStatus } from "./types";

export type MutResult =
  | { ok: true; message?: string; status?: SubmissionStatus; fulfillmentId?: number | null; receivedAt?: string | null }
  | { ok: false; error: string };

const ok = (message: string, extra?: { status?: SubmissionStatus; fulfillmentId?: number | null; receivedAt?: string | null }): MutResult =>
  ({ ok: true, message, ...extra });
const fail = (error: string): MutResult => ({ ok: false, error });

function sqliteNow(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}
function nowISO(): string {
  return new Date().toISOString();
}

type SubRow = { id: number; status: SubmissionStatus; item_id: number; nickname: string; qty: number | null; qty_label: string };
type FulRow = { id: number; received: number; received_at: string | null; submission_id: number | null };

// ---------- Transisi status pengajuan (satu tombol / keputusan eksplisit) ----------

export async function transitionSubmission(id: number, action: SubmissionAction, note: string): Promise<MutResult> {
  if (isSupabaseConfigured()) return sbTransition(id, action, note);
  return sqliteTransition(id, action, note);
}

async function sbTransition(id: number, action: SubmissionAction, note: string): Promise<MutResult> {
  const { data, error } = await getSupabase().rpc("panitia_submission_transition", {
    p_id: id,
    p_action: action,
    p_note: note.slice(0, 300),
  });
  throwIfError(error, "transitionSubmission");
  const r = data as { ok?: boolean; error?: string; status?: SubmissionStatus; message?: string; fulfillment_id?: number | null; received_at?: string | null } | null;
  if (!r?.ok) return fail(r?.error || "Gagal memperbarui status pengajuan.");
  return ok(r.message || "Status diperbarui.", { status: r.status, fulfillmentId: r.fulfillment_id ?? null, receivedAt: r.received_at ?? null });
}

async function sqliteTransition(id: number, action: SubmissionAction, note: string): Promise<MutResult> {
  const { getDb } = await loadSqliteDb();
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const sub = db.prepare("SELECT id,status,item_id,nickname,qty,qty_label FROM submissions WHERE id=?").get(id) as SubRow | undefined;
    if (!sub) { db.exec("ROLLBACK"); return fail("Pengajuan tidak ditemukan."); }
    const t = resolveTransition(sub.status, action);
    if ("error" in t) { db.exec("ROLLBACK"); return fail(t.error); }

    const f = db.prepare("SELECT id,received,received_at FROM fulfillments WHERE submission_id=?").get(id) as FulRow | undefined;
    const now = sqliteNow();
    const cleanNote = note.slice(0, 1000);
    let fulfillmentId: number | null = null;
    let receivedAt: string | null = null;

    if (t.to === "approved") {
      if (!f) {
        const r = db.prepare("INSERT INTO fulfillments (item_id,submission_id,person_name,qty,qty_label,received,received_at) VALUES (?,?,?,?,?,0,NULL)")
          .run(sub.item_id, id, sub.nickname, sub.qty, sub.qty_label);
        fulfillmentId = Number(r.lastInsertRowid);
      } else {
        db.prepare("UPDATE fulfillments SET received=0, received_at=NULL WHERE id=?").run(f.id);
        fulfillmentId = f.id;
      }
    } else if (t.to === "done") {
      if (!f) {
        const r = db.prepare("INSERT INTO fulfillments (item_id,submission_id,person_name,qty,qty_label,received,received_at) VALUES (?,?,?,?,?,1,?)")
          .run(sub.item_id, id, sub.nickname, sub.qty, sub.qty_label, now);
        fulfillmentId = Number(r.lastInsertRowid);
        receivedAt = now;
      } else {
        receivedAt = f.received_at ?? now;
        db.prepare("UPDATE fulfillments SET received=1, received_at=? WHERE id=?").run(receivedAt, f.id);
        fulfillmentId = f.id;
      }
    } else {
      // pending / needs_confirmation / rejected: tidak boleh ada catatan pemenuhan.
      if (f) {
        if (f.received) { db.exec("ROLLBACK"); return fail("Sudah diterima fisik. Batalkan penerimaan dulu sebelum mengubah status."); }
        db.prepare("DELETE FROM fulfillments WHERE id=?").run(f.id);
      }
    }

    db.prepare("UPDATE submissions SET status=?, decided_at=?, decision_note=? WHERE id=?").run(t.to, now, cleanNote, id);
    db.prepare("INSERT INTO status_logs (entity_type,entity_id,status,note,actor) VALUES ('submission',?,?,?,'panitia')")
      .run(id, t.to, (cleanNote || t.message).slice(0, 300));
    db.exec("COMMIT");
    return ok(t.message, { status: t.to, fulfillmentId, receivedAt });
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch {}
    throw e;
  }
}

// ---------- Terima / batalkan terima pada catatan pemenuhan ----------

export async function setFulfillmentReceived(id: number, received: boolean): Promise<MutResult> {
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    const { data: f, error } = await sb.from("fulfillments").select("id, submission_id, received_at").eq("id", id).maybeSingle();
    throwIfError(error, "setFulfillmentReceived(baca)");
    if (!f) return fail("Catatan pemenuhan tidak ditemukan.");
    if (f.submission_id != null) return sbTransition(Number(f.submission_id), received ? "receive" : "undo_receive", "");
    const receivedAt = received ? ((f.received_at as string | null) ?? nowISO()) : null;
    const { error: upErr } = await sb.from("fulfillments").update({ received, received_at: receivedAt }).eq("id", id);
    throwIfError(upErr, "setFulfillmentReceived");
    return ok(received ? "Barang ditandai diterima." : "Tanda diterima dibatalkan.", { receivedAt });
  }

  const { getDb } = await loadSqliteDb();
  const db = getDb();
  const f = db.prepare("SELECT id, submission_id FROM fulfillments WHERE id=?").get(id) as FulRow | undefined;
  if (!f) return fail("Catatan pemenuhan tidak ditemukan.");
  if (f.submission_id != null) return sqliteTransition(f.submission_id, received ? "receive" : "undo_receive", "");
  const now = sqliteNow();
  db.prepare("UPDATE fulfillments SET received=?, received_at=CASE WHEN ? THEN COALESCE(received_at, ?) ELSE NULL END WHERE id=?")
    .run(received ? 1 : 0, received ? 1 : 0, now, id);
  return ok(received ? "Barang ditandai diterima." : "Tanda diterima dibatalkan.");
}

// ---------- Hapus catatan pemenuhan (jaga konsistensi status pengajuan) ----------

export async function deleteFulfillmentConsistent(id: number): Promise<MutResult> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabase().rpc("panitia_delete_fulfillment", { p_id: id });
    throwIfError(error, "deleteFulfillment");
    const r = data as { ok?: boolean; error?: string; message?: string; status?: SubmissionStatus } | null;
    if (!r?.ok) return fail(r?.error || "Gagal menghapus catatan.");
    return ok(r.message || "Data barang dihapus.", { status: r.status });
  }

  const { getDb } = await loadSqliteDb();
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const f = db.prepare("SELECT id, submission_id FROM fulfillments WHERE id=?").get(id) as FulRow | undefined;
    if (!f) { db.exec("ROLLBACK"); return fail("Catatan pemenuhan tidak ditemukan."); }
    db.prepare("DELETE FROM fulfillments WHERE id=?").run(id);
    if (f.submission_id != null) {
      // Catatan kesediaan/penerimaan dihapus → pengajuan kembali menunggu (tidak lagi dianggap disetujui/diterima).
      db.prepare("UPDATE submissions SET status='pending', decided_at=NULL, decision_note='' WHERE id=?").run(f.submission_id);
      db.prepare("INSERT INTO status_logs (entity_type,entity_id,status,note,actor) VALUES ('submission',?,'pending','Catatan pemenuhan dihapus; pengajuan kembali menunggu konfirmasi.','panitia')")
        .run(f.submission_id);
      db.exec("COMMIT");
      return ok("Catatan dihapus; pengajuan kembali menunggu konfirmasi.", { status: "pending" });
    }
    db.exec("COMMIT");
    return ok("Data barang dihapus.");
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch {}
    throw e;
  }
}
