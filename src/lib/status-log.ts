// Riwayat status untuk pengajuan infaq & usulan item (jejak audit lengkap).
import { isSupabaseConfigured, getSupabase, loadSqliteDb, throwIfError, TABLES } from "./supabase";
import type { StatusEntity, StatusLogRow } from "./types";

export async function logStatus(
  entityType: StatusEntity,
  entityId: number,
  status: string,
  note: string,
  actor: "anggota" | "panitia" | "sistem" = "sistem"
): Promise<void> {
  const cleanNote = note.slice(0, 300);
  if (isSupabaseConfigured()) {
    const { error } = await getSupabase().from(TABLES.status_logs).insert({
      entity_type: entityType,
      entity_id: entityId,
      status,
      note: cleanNote,
      actor,
    });
    throwIfError(error, "logStatus");
    return;
  }
  const { getDb } = await loadSqliteDb();
  getDb()
    .prepare("INSERT INTO status_logs (entity_type, entity_id, status, note, actor) VALUES (?,?,?,?,?)")
    .run(entityType, entityId, status, cleanNote, actor);
}

export async function getStatusLogs(entityType: StatusEntity, entityId: number): Promise<StatusLogRow[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabase()
      .from(TABLES.status_logs)
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("id");
    throwIfError(error, "getStatusLogs");
    return (data ?? []).map((r) => ({
      id: Number(r.id),
      entity_type: r.entity_type as StatusEntity,
      entity_id: Number(r.entity_id),
      status: String(r.status),
      note: String(r.note ?? ""),
      actor: r.actor as StatusLogRow["actor"],
      created_at: String(r.created_at ?? ""),
    }));
  }
  const { getDb } = await loadSqliteDb();
  return getDb()
    .prepare("SELECT * FROM status_logs WHERE entity_type = ? AND entity_id = ? ORDER BY id")
    .all(entityType, entityId) as unknown as StatusLogRow[];
}
