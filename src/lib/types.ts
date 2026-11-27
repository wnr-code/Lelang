export type EventStatus = "draft" | "active" | "completed" | "archived";
export type SubmissionStatus = "pending" | "approved" | "rejected";
export type ItemStatus = "open" | "process" | "fulfilled";
export type SurplusCondition = "sisa" | "berlebih";
export type SurplusDecision =
  | "disimpan"
  | "kegiatan_berikutnya"
  | "ditukar"
  | "dijual"
  | "didonasikan"
  | "lainnya";

export interface EventRow {
  id: number;
  slug: string;
  title: string;
  description: string;
  event_date: string | null;
  location: string;
  status: EventStatus;
  cover_image: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ItemRow {
  id: number;
  event_id: number;
  name: string;
  target_qty: number | null;
  target_label: string;
  unit: string;
  note: string;
  sort_order: number;
  is_open: number;
  created_at: string;
}

export interface SubmissionRow {
  id: number;
  event_id: number;
  item_id: number;
  nickname: string;
  qty: number | null;
  qty_label: string;
  message: string;
  contact: string;
  status: SubmissionStatus;
  track_code: string;
  created_at: string;
  decided_at: string | null;
  decision_note: string;
}

export interface FulfillmentRow {
  id: number;
  item_id: number;
  submission_id: number | null;
  person_name: string;
  qty: number | null;
  qty_label: string;
  is_pic: number;
  received: number;
  note: string;
  created_at: string;
}

export interface SurplusRow {
  id: number;
  event_id: number;
  item_id: number | null;
  item_name: string;
  qty: number | null;
  qty_label: string;
  condition: SurplusCondition;
  decision: SurplusDecision;
  decision_note: string;
  pic_name: string;
  outcome: string;
  created_at: string;
  resolved_at: string | null;
}

export interface PhotoRow {
  id: number;
  event_id: number;
  file_path: string;
  caption: string;
  created_at: string;
}

export interface ItemWithStatus extends ItemRow {
  received_qty: number;
  received_label: string;
  approved_count: number;
  pending_count: number;
  pic_name: string;
  status: ItemStatus;
}

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  open: "Dibuka",
  process: "Dalam proses",
  fulfilled: "Terpenuhi",
};

export const SURPLUS_DECISION_LABEL: Record<SurplusDecision, string> = {
  disimpan: "Disimpan",
  kegiatan_berikutnya: "Untuk kegiatan berikutnya",
  ditukar: "Ditukar",
  dijual: "Dijual kembali",
  didonasikan: "Didonasikan",
  lainnya: "Lainnya",
};

export const SURPLUS_CONDITION_LABEL: Record<SurplusCondition, string> = {
  sisa: "Sisa",
  berlebih: "Berlebih",
};
