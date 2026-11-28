"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserCheck, PackageCheck, Trash2, CalendarCheck } from "lucide-react";
import { addFulfillmentAction, toggleReceivedAction, setPicAction, deleteFulfillmentAction } from "@/lib/actions";
import type { ItemWithStatus, FulfillmentRow } from "@/lib/types";
import { ItemStatusChip, ProgressBar } from "@/components/ui";
import { ITEM_STATUS_LABEL } from "@/lib/types";
import { fmtQty } from "@/lib/item-status";

export function GoodsItemCard({ item, fulfillments }: { item: ItemWithStatus; fulfillments: FulfillmentRow[] }) {
  const [adding, setAdding] = useState(false);
  const { pending, error, run } = useAction();

  return (
    <div className="card px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold text-ink">{item.name}</h3>
          <span className={`chip mt-1 ${item.kind === "tenaga" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-800"}`}>
            {item.kind === "tenaga" ? "Bantuan Tenaga" : "Barang / Sembako"}
          </span>
        </div>
        <ItemStatusChip status={item.status} />
      </div>

      {/* Catatan lengkap tiap barang: target, pengajuan, disetujui, diterima, satuan, PJ, tanggal, status */}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl bg-stone-50 px-3.5 py-3 text-[11px] sm:grid-cols-4">
        <Field label="Jumlah target" value={item.target_label} />
        <Field label="Satuan" value={item.unit || "—"} />
        <Field label="Jumlah pengajuan" value={`${item.submitted_count} pengajuan`} />
        <Field label="Jumlah disetujui" value={`${item.approved_count}${item.approved_qty > 0 ? ` (${fmtQty(item.approved_qty)}${item.unit ? " " + item.unit : ""})` : ""}`} />
        <Field label="Jumlah diterima" value={item.received_label || "0"} strong />
        <Field label="Penanggung jawab" value={item.pic_name || "Belum ditetapkan"} />
        <Field label="Tanggal penerimaan" value={item.received_at ? shortDateTime(item.received_at) : "Belum diterima"} />
        <Field label="Status" value={ITEM_STATUS_LABEL[item.status]} />
      </dl>

      {item.target_qty != null && (
        <ProgressBar value={item.received_qty} max={item.target_qty} className="mt-3" />
      )}

      {/* Daftar pemenuhan */}
      <div className="mt-3 space-y-2">
        {fulfillments.length === 0 && (
          <p className="rounded-lg bg-stone-50 px-3 py-2.5 text-xs text-stone-400">
            Belum ada kesediaan tercatat. Setujui pengajuan anggota atau tambah manual di bawah.
          </p>
        )}
        {fulfillments.map((f) => (
          <div key={f.id} className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 ring-1 ${f.is_pic ? "bg-emerald-50 ring-emerald-200" : "bg-stone-50 ring-stone-100"}`}>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-ink">
                {f.person_name}
                {f.is_pic === 1 && (
                  <span className="chip bg-emerald-600 text-white"><UserCheck className="h-3 w-3" /> Penanggung Jawab</span>
                )}
              </p>
              <p className="text-[11px] text-stone-400">
                {f.qty_label || "Jumlah tidak dicatat"}
                {f.note ? ` · ${f.note}` : ""}
              </p>
              {f.received === 1 && (
                <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                  <CalendarCheck className="h-3 w-3" /> Diterima: {shortDateTime(f.received_at ?? f.created_at)}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                disabled={pending}
                onClick={() => run(() => toggleReceivedAction(f.id, f.received !== 1))}
                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${f.received === 1 ? "bg-emerald-600 text-white" : "bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-emerald-50"}`}
                title={f.received === 1 ? "Sudah diterima — klik untuk membatalkan" : "Tandai barang sudah diterima"}
              >
                <PackageCheck className="mr-1 inline h-3.5 w-3.5" />
                {f.received === 1 ? "Diterima" : "Terima?"}
              </button>
              {f.is_pic !== 1 && (
                <button
                  disabled={pending}
                  onClick={() => run(() => setPicAction(item.id, f.id))}
                  className="btn-ghost px-2 py-1.5 text-[11px]"
                  title="Tetapkan sebagai penanggung jawab"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                disabled={pending}
                onClick={() => { if (confirm(`Hapus catatan ${f.person_name}?`)) run(() => deleteFulfillmentAction(f.id)); }}
                className="btn-ghost px-1.5 py-1.5 text-rose-400"
                aria-label="Hapus"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}

      {/* Tambah manual */}
      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("item_id", String(item.id));
            run(() => addFulfillmentAction(null, fd).then((r) => { if (r.ok) setAdding(false); return r; }));
          }}
          className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100"
        >
          <input name="person_name" required maxLength={80} className="input col-span-2 py-2 text-xs" placeholder="Nama Ikhwan/Akhwat" />
          <input name="qty" type="number" min="0" step="any" className="input py-2 text-xs" placeholder={`Jumlah${item.unit ? ` (${item.unit})` : ""}`} />
          <input name="qty_label" maxLength={80} className="input py-2 text-xs" placeholder="Atau label (mis. 2 karung)" />
          <input name="note" maxLength={1000} className="input col-span-2 py-2 text-xs" placeholder="Catatan (opsional)" />
          <button type="submit" disabled={pending} className="btn-primary py-2 text-xs">Tambah</button>
          <button type="button" onClick={() => setAdding(false)} className="btn-ghost py-2 text-xs">Batal</button>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="btn-secondary mt-3 w-full py-2 text-xs">
          <Plus className="h-3.5 w-3.5" /> Tambah Bantuan Manual
        </button>
      )}
    </div>
  );
}

function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error || "Terjadi kesalahan.");
      else router.refresh();
    });
  }
  return { pending, error, run };
}

function Field({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{label}</dt>
      <dd className={`truncate ${strong ? "font-extrabold text-emerald-700" : "font-semibold text-ink"}`}>{value}</dd>
    </div>
  );
}

function shortDateTime(s: string): string {
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
