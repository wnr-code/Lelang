// Alur status pengajuan infaq — satu sumber kebenaran (dipakai SQLite & Supabase).
// Prinsip: disetujui ≠ diterima fisik. Hanya aksi penerimaan yang menambah jumlah diterima.
import type { SubmissionStatus } from "./types";

export type SubmissionAction =
  | "advance" // satu tombol: maju ke tahap berikutnya sesuai status saat ini
  | "approve"
  | "needs_confirmation"
  | "reject"
  | "receive"
  | "undo_receive";

/** Tahap berikutnya untuk tombol tunggal. `null` = sudah selesai (tidak ada aksi maju). */
export const NEXT_STATUS: Record<SubmissionStatus, SubmissionStatus | null> = {
  pending: "approved",
  needs_confirmation: "approved",
  approved: "done",
  rejected: "approved",
  done: null,
};

export function nextSubmissionStatus(status: SubmissionStatus): SubmissionStatus | null {
  return NEXT_STATUS[status] ?? null;
}

export type Transition = { to: SubmissionStatus; message: string } | { error: string };

const MESSAGE: Record<SubmissionStatus, string> = {
  pending: "Pengajuan kembali menunggu konfirmasi.",
  approved: "Disetujui — kesediaan dicatat, belum diterima fisik.",
  needs_confirmation: "Perlu konfirmasi — hubungi anggota lewat WhatsApp.",
  rejected: "Pengajuan ditolak.",
  done: "Diterima fisik — pengajuan selesai dan tercatat diterima.",
};

export function statusMessage(status: SubmissionStatus): string {
  return MESSAGE[status];
}

/**
 * Validasi transisi. Aturan penting:
 * - `receive` hanya dari approved (atau done idempoten); tidak boleh langsung dari menunggu/ditolak.
 * - Pengajuan yang sudah diterima (done) tidak boleh ditolak/diturunkan kecuali lewat `undo_receive`.
 * - `undo_receive` hanya dari done (atau approved idempoten).
 */
export function resolveTransition(current: SubmissionStatus, action: SubmissionAction): Transition {
  if (action === "advance") {
    const to = nextSubmissionStatus(current);
    if (!to) return { error: "Pengajuan sudah selesai — tidak ada tahap berikutnya." };
    return { to, message: MESSAGE[to] };
  }
  if (action === "approve") {
    if (current === "done") return { error: "Sudah diterima fisik. Batalkan penerimaan dulu sebelum mengubah status." };
    return { to: "approved", message: MESSAGE.approved };
  }
  if (action === "needs_confirmation") {
    if (current === "done") return { error: "Sudah diterima fisik. Batalkan penerimaan dulu sebelum mengubah status." };
    return { to: "needs_confirmation", message: MESSAGE.needs_confirmation };
  }
  if (action === "reject") {
    if (current === "done") return { error: "Sudah diterima fisik. Batalkan penerimaan dulu sebelum menolak." };
    return { to: "rejected", message: MESSAGE.rejected };
  }
  if (action === "receive") {
    if (current !== "approved" && current !== "done") {
      return { error: "Setujui pengajuan dulu sebelum menandai diterima fisik." };
    }
    return { to: "done", message: MESSAGE.done };
  }
  if (action === "undo_receive") {
    if (current !== "done" && current !== "approved") {
      return { error: "Hanya pengajuan yang sudah diterima yang bisa dibalkan penerimaannya." };
    }
    return { to: "approved", message: "Tanda diterima dibatalkan — kembali disetujui, belum diterima fisik." };
  }
  return { error: "Aksi tidak valid." };
}

export function decisionToAction(decision: SubmissionStatus): SubmissionAction | null {
  switch (decision) {
    case "approved": return "approve";
    case "needs_confirmation": return "needs_confirmation";
    case "rejected": return "reject";
    case "done": return "receive";
    default: return null;
  }
}

/** Label tombol aksi utama (satu tombol) sesuai status. */
export function primaryActionLabel(status: SubmissionStatus): string | null {
  switch (status) {
    case "pending":
    case "needs_confirmation": return "Setujui Pengajuan";
    case "approved": return "Tandai Diterima Fisik";
    case "rejected": return "Setujui Kembali";
    case "done": return null;
  }
}

/** Petunjuk singkat satu baris di bawah tombol (hindari paragraf panjang). */
export function statusHint(status: SubmissionStatus): string {
  switch (status) {
    case "pending": return "Menyetujui mencatat kesediaan — belum dihitung diterima.";
    case "needs_confirmation": return "Hubungi anggota dulu, lalu setujui bila sudah jelas.";
    case "approved": return "Klik hanya setelah barang/tenaga benar-benar diterima.";
    case "rejected": return "Ditolak — bisa disetujui kembali bila diperlukan.";
    case "done": return "Sudah diterima fisik dan terverifikasi panitia.";
  }
}
