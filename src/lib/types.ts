export type EventStatus = "draft" | "active" | "completed" | "archived";
export type SubmissionStatus = "pending" | "approved" | "needs_confirmation" | "rejected" | "done";
export type ItemKind = "barang" | "tenaga";
export type ItemCategory = "sembako" | "barang" | "tenaga" | "lainnya";
export type ItemStatus = "open" | "process" | "fulfilled";
export type SurplusCondition = "sisa" | "berlebih";
export type SurplusDecision =
  | "disimpan"
  | "kegiatan_berikutnya"
  | "ditukar"
  | "dijual"
  | "disalurkan"
  | "didonasikan"
  | "lainnya";

export interface EventRow {
  id: number;
  slug: string;
  title: string;
  description: string;
  event_date: string | null;
  event_time: string | null;
  location: string;
  status: EventStatus;
  cover_image: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ItemRow {
  id: number;
  event_id: number;
  kind: ItemKind;
  category: ItemCategory;
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
  unit: string;
  availability: string;
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
  received_at: string | null;
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
  submitted_count: number;
  approved_count: number;
  approved_qty: number;
  pending_count: number;
  pic_name: string;
  received_at: string | null;
  status: ItemStatus;
}

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  open: "Dibuka",
  process: "Dalam proses",
  fulfilled: "Terpenuhi",
};

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  pending: "Menunggu konfirmasi",
  approved: "Disetujui",
  needs_confirmation: "Perlu konfirmasi",
  rejected: "Ditolak",
  done: "Selesai",
};

/** Status yang boleh dipilih panitia saat meninjau pengajuan. */
export const SUBMISSION_DECISIONS: SubmissionStatus[] = ["approved", "needs_confirmation", "rejected", "done"];

export const ITEM_KIND_LABEL: Record<ItemKind, string> = {
  barang: "Barang / Sembako",
  tenaga: "Bantuan Tenaga",
};

/** Kategori kebutuhan — dipakai sebagai tab di halaman kegiatan. */
export const ITEM_CATEGORY_LABEL: Record<ItemCategory, string> = {
  sembako: "Sembako",
  barang: "Barang",
  tenaga: "Bantuan Tenaga",
  lainnya: "Lainnya",
};

export const ITEM_CATEGORY_ORDER: ItemCategory[] = ["sembako", "barang", "tenaga", "lainnya"];

/** Contoh bantuan tenaga untuk panduan panitia & anggota. */
export const TENAGA_EXAMPLES = [
  "Juru Parkir",
  "Tenaga Masak (Dapur Umum)",
  "Tenaga Bongkar & Angkut",
  "Tenaga Kebersihan",
  "Penerima Tamu",
  "Tenaga Dokumentasi",
];

export const SURPLUS_DECISION_LABEL: Record<SurplusDecision, string> = {
  disimpan: "Disimpan",
  kegiatan_berikutnya: "Digunakan untuk kegiatan berikutnya",
  ditukar: "Ditukar",
  dijual: "Dijual kembali",
  disalurkan: "Disalurkan",
  didonasikan: "Didonasikan",
  lainnya: "Lainnya",
};

/** Lima pilihan pengelolaan sisa barang sesuai ketentuan panitia. */
export const SURPLUS_DECISION_OPTIONS: SurplusDecision[] = [
  "disimpan",
  "kegiatan_berikutnya",
  "ditukar",
  "dijual",
  "disalurkan",
];

/** Satuan umum untuk infaq barang/sembako. */
export const UNIT_OPTIONS = ["Kg", "Gram", "Liter", "Dus", "Bungkus", "Pcs", "Karung", "Toples", "Orang", "Porsi"];

export const SURPLUS_CONDITION_LABEL: Record<SurplusCondition, string> = {
  sisa: "Sisa",
  berlebih: "Berlebih",
};
