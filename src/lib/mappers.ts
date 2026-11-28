// Pemetaan baris Supabase (PostgreSQL) ke bentuk types.ts yang dipakai aplikasi.
// Perbedaan utama: boolean (is_open/is_pic/received) -> number 0/1, dan
// timestamptz ISO -> teks "YYYY-MM-DD HH:MM:SS" (UTC) agar kompatibel dengan
// formatDateTime/formatDate di UI yang semula membaca format SQLite.
import type {
  EventRow,
  ItemRow,
  SubmissionRow,
  FulfillmentRow,
  SurplusRow,
  PhotoRow,
} from "./types";

/** timestamptz ISO ("2026-11-27T10:00:00+00:00") -> "2026-11-27 10:00:00" (UTC). */
export function normTs(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

/** date ("YYYY-MM-DD") tetap apa adanya; null tetap null. */
function normDate(v: unknown): string | null {
  return v == null ? null : String(v);
}

function b(v: unknown): number {
  return v ? 1 : 0;
}

type Raw = Record<string, unknown>;

export function mapEvent(r: Raw): EventRow {
  return {
    id: Number(r.id),
    slug: String(r.slug),
    title: String(r.title),
    description: String(r.description ?? ""),
    event_date: normDate(r.event_date),
    event_time: r.event_time == null || r.event_time === "" ? null : String(r.event_time).slice(0, 5),
    location: String(r.location ?? ""),
    status: r.status as EventRow["status"],
    cover_image: r.cover_image == null ? null : String(r.cover_image),
    created_at: normTs(r.created_at) ?? "",
    completed_at: normTs(r.completed_at),
  };
}

export function mapItem(r: Raw): ItemRow {
  return {
    id: Number(r.id),
    event_id: Number(r.event_id),
    kind: r.kind === "tenaga" ? "tenaga" : "barang",
    category: (["sembako", "barang", "tenaga", "lainnya"].includes(String(r.category))
      ? String(r.category)
      : r.kind === "tenaga" ? "tenaga" : "barang") as ItemRow["category"],
    name: String(r.name),
    target_qty: r.target_qty == null ? null : Number(r.target_qty),
    target_label: String(r.target_label ?? ""),
    unit: String(r.unit ?? ""),
    note: String(r.note ?? ""),
    sort_order: Number(r.sort_order ?? 0),
    is_open: b(r.is_open),
    created_at: normTs(r.created_at) ?? "",
  };
}

export function mapSubmission(r: Raw): SubmissionRow {
  return {
    id: Number(r.id),
    event_id: Number(r.event_id),
    item_id: Number(r.item_id),
    nickname: String(r.nickname),
    qty: r.qty == null ? null : Number(r.qty),
    qty_label: String(r.qty_label ?? ""),
    unit: String(r.unit ?? ""),
    availability: String(r.availability ?? ""),
    message: String(r.message ?? ""),
    contact: String(r.contact ?? ""),
    status: r.status as SubmissionRow["status"],
    track_code: String(r.track_code),
    created_at: normTs(r.created_at) ?? "",
    decided_at: normTs(r.decided_at),
    decision_note: String(r.decision_note ?? ""),
  };
}

export function mapFulfillment(r: Raw): FulfillmentRow {
  return {
    id: Number(r.id),
    item_id: Number(r.item_id),
    submission_id: r.submission_id == null ? null : Number(r.submission_id),
    person_name: String(r.person_name),
    qty: r.qty == null ? null : Number(r.qty),
    qty_label: String(r.qty_label ?? ""),
    is_pic: b(r.is_pic),
    received: b(r.received),
    received_at: normTs(r.received_at),
    note: String(r.note ?? ""),
    created_at: normTs(r.created_at) ?? "",
  };
}

export function mapSurplus(r: Raw): SurplusRow {
  return {
    id: Number(r.id),
    event_id: Number(r.event_id),
    item_id: r.item_id == null ? null : Number(r.item_id),
    item_name: String(r.item_name),
    qty: r.qty == null ? null : Number(r.qty),
    qty_label: String(r.qty_label ?? ""),
    condition: r.condition as SurplusRow["condition"],
    decision: r.decision as SurplusRow["decision"],
    decision_note: String(r.decision_note ?? ""),
    pic_name: String(r.pic_name ?? ""),
    outcome: String(r.outcome ?? ""),
    created_at: normTs(r.created_at) ?? "",
    resolved_at: normTs(r.resolved_at),
  };
}

export function mapPhoto(r: Raw): PhotoRow {
  return {
    id: Number(r.id),
    event_id: Number(r.event_id),
    file_path: String(r.file_path),
    caption: String(r.caption ?? ""),
    created_at: normTs(r.created_at) ?? "",
  };
}
