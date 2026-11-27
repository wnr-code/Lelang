// Helper murni (tanpa backend) untuk menghitung status kebutuhan.
// Dipakai oleh jalur SQLite maupun Supabase agar logika status konsisten.
import type { ItemRow, ItemWithStatus, ItemStatus, FulfillmentRow, SubmissionRow } from "./types";

export function deriveItemStatus(item: ItemRow, receivedQty: number, approvedCount: number): ItemStatus {
  if (!item.is_open) return "fulfilled";
  if (item.target_qty != null && receivedQty >= item.target_qty) return "fulfilled";
  if (approvedCount > 0 || receivedQty > 0) return "process";
  return "open";
}

export function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

/**
 * Hitung ItemWithStatus[] dari baris mentah items + fulfillments + submissions
 * (semua sudah difilter untuk satu kegiatan). Logika identik dengan agregasi SQL
 * SQLite: received_qty = SUM(qty WHERE received), pic = person_name WHERE is_pic,
 * approved/pending = COUNT submissions per status.
 */
export function computeItemsWithStatus(
  items: ItemRow[],
  fulfillments: FulfillmentRow[],
  submissions: SubmissionRow[]
): ItemWithStatus[] {
  const fulByItem = new Map<number, FulfillmentRow[]>();
  for (const f of fulfillments) {
    const arr = fulByItem.get(f.item_id) ?? [];
    arr.push(f);
    fulByItem.set(f.item_id, arr);
  }
  const subByItem = new Map<number, SubmissionRow[]>();
  for (const s of submissions) {
    const arr = subByItem.get(s.item_id) ?? [];
    arr.push(s);
    subByItem.set(s.item_id, arr);
  }

  return items.map((item) => {
    const fuls = fulByItem.get(item.id) ?? [];
    const subs = subByItem.get(item.id) ?? [];
    let receivedQty = 0;
    let picName = "";
    for (const f of fuls) {
      if (f.received) receivedQty += f.qty ?? 0;
      if (f.is_pic && f.person_name) picName = f.person_name;
    }
    const approvedCount = subs.filter((s) => s.status === "approved").length;
    const pendingCount = subs.filter((s) => s.status === "pending").length;
    const unit = item.unit ? ` ${item.unit}` : "";
    return {
      ...item,
      received_qty: receivedQty,
      received_label: receivedQty > 0 ? `${fmtQty(receivedQty)}${unit}` : "",
      approved_count: approvedCount,
      pending_count: pendingCount,
      pic_name: picName,
      status: deriveItemStatus(item, receivedQty, approvedCount),
    };
  });
}
