"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check, X, MessageSquare, Phone, Clock3, HelpCircle, PackageCheck,
  HandHeart, MessageCircle, Package, ChevronDown, Undo2, Loader2,
} from "lucide-react";
import { advanceSubmissionAction, decideSubmissionAction, undoReceiveSubmissionAction } from "@/lib/actions";
import { SubmissionStatusChip, relativeTime } from "@/components/ui";
import { primaryActionLabel, statusHint } from "@/lib/submission-flow";
import { waFollowUp, followUpMessage } from "@/lib/wa";
import type { SubmissionRow, SubmissionStatus } from "@/lib/types";

type SubWithMeta = SubmissionRow & {
  item_name: string;
  event_title: string;
  event_slug: string;
  item_kind?: string;
  received_at?: string | null;
};

type ActionResult =
  | { ok: true; message?: string; status?: SubmissionStatus; receivedAt?: string | null }
  | { ok: false; error: string };

/**
 * Kartu pengajuan ringkas: SATU tombol utama yang memajukan status di tempat.
 * Kartu tidak hilang setelah aksi (state lokal diperbarui optimistik), tanpa pindah tab.
 * Aksi lain (konfirmasi / tolak / catatan / batalkan terima) tersembunyi di "Opsi lain".
 */
export function SubmissionCard({ sub }: { sub: SubWithMeta }) {
  const [status, setStatus] = useState<SubmissionStatus>(sub.status);
  const [receivedAt, setReceivedAt] = useState<string | null>(sub.received_at ?? null);
  const [note, setNote] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const router = useRouter();

  const isTenaga = sub.item_kind === "tenaga";
  const primaryLabel = primaryActionLabel(status);
  const hint = statusHint(status);

  function run(fn: () => Promise<ActionResult>) {
    setError("");
    setFlash("");
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) { setError(res.error); return; }
      if (res.status) setStatus(res.status);
      setReceivedAt(res.receivedAt ?? (res.status === "done" ? new Date().toISOString() : null));
      setFlash(res.message || "Status diperbarui.");
      setShowOptions(false);
      setShowNote(false);
      router.refresh();
    });
  }

  const advance = () => run(() => advanceSubmissionAction(sub.id, note));
  const confirmNeed = () => run(() => decideSubmissionAction(sub.id, "needs_confirmation", note));
  const reject = () => run(() => decideSubmissionAction(sub.id, "rejected", note));
  const undoReceive = () => run(() => undoReceiveSubmissionAction(sub.id));

  return (
    <div className={`card px-4 py-3.5 transition ${status === "pending" ? "ring-1 ring-amber-200" : status === "needs_confirmation" ? "ring-1 ring-sky-200" : status === "done" ? "ring-1 ring-emerald-200" : ""}`}>
      {/* Baris utama: nama, jumlah, badge status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-ink">{sub.nickname}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500">
            {isTenaga ? <HandHeart className="h-3.5 w-3.5 shrink-0 text-violet-600" /> : <Package className="h-3.5 w-3.5 shrink-0 text-emerald-700" />}
            <span className="truncate">{sub.item_name}</span>
            <span className="font-bold text-emerald-700">· {sub.qty_label || "Secukupnya"}{sub.unit && !sub.qty_label.includes(sub.unit) ? ` ${sub.unit}` : ""}</span>
          </p>
        </div>
        <SubmissionStatusChip status={status} />
      </div>

      {/* Meta ringkas satu baris */}
      <p className="mt-1.5 truncate text-[11px] text-stone-400">
        {sub.event_title} · {relativeTime(sub.created_at)}
        {sub.availability ? ` · tersedia ${sub.availability}` : ""}
      </p>

      {sub.message && (
        <p className="mt-2 line-clamp-2 rounded-lg bg-stone-50 px-2.5 py-1.5 text-xs leading-relaxed text-stone-600">{sub.message}</p>
      )}

      {/* Penanda tegas: disetujui ≠ diterima fisik */}
      {status === "approved" && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
          <Clock3 className="h-3.5 w-3.5" /> Disetujui — belum diterima fisik
        </p>
      )}
      {status === "done" && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
          <PackageCheck className="h-3.5 w-3.5" /> Diterima fisik{receivedAt ? ` · ${relativeTime(receivedAt)}` : ""}
        </p>
      )}

      {sub.decision_note && status !== "pending" && (
        <p className="mt-1.5 truncate text-[11px] italic text-stone-400">Catatan: “{sub.decision_note}”</p>
      )}

      {/* SATU tombol utama */}
      <div className="mt-3">
        {primaryLabel ? (
          <button
            type="button"
            disabled={pending}
            onClick={advance}
            className={`btn-primary w-full justify-center py-2.5 text-sm ${status === "approved" ? "" : ""}`}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : status === "approved" ? <PackageCheck className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {primaryLabel}
          </button>
        ) : (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">
            <PackageCheck className="h-4 w-4" /> Selesai — sudah diterima fisik
          </div>
        )}
        <p className="mt-1.5 text-center text-[11px] leading-snug text-stone-400">{hint}</p>
        {flash && <p className="mt-1 text-center text-[11px] font-semibold text-emerald-700">{flash}</p>}
        {error && <p className="mt-1 text-center text-[11px] font-semibold text-rose-600">{error}</p>}
      </div>

      {/* Aksi sekunder: tersembunyi agar tidak berantakan */}
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setShowOptions(!showOptions)}
          className="mx-auto flex items-center gap-1 text-[11px] font-bold text-stone-400 hover:text-stone-600"
          aria-expanded={showOptions}
        >
          Opsi lain <ChevronDown className={`h-3.5 w-3.5 transition ${showOptions ? "rotate-180" : ""}`} />
        </button>

        {showOptions && (
          <div className="mt-2 space-y-2 rounded-xl bg-stone-50 p-2.5">
            <div className="flex flex-wrap gap-1.5">
              {status !== "needs_confirmation" && status !== "done" && (
                <button disabled={pending} onClick={confirmNeed} className="btn-secondary px-3 py-1.5 text-[11px]">
                  <HelpCircle className="h-3.5 w-3.5" /> Perlu konfirmasi
                </button>
              )}
              {status !== "rejected" && status !== "done" && (
                <button disabled={pending} onClick={reject} className="btn-danger px-3 py-1.5 text-[11px]">
                  <X className="h-3.5 w-3.5" /> Tolak
                </button>
              )}
              {status === "done" && (
                <button disabled={pending} onClick={undoReceive} className="btn-secondary px-3 py-1.5 text-[11px]">
                  <Undo2 className="h-3.5 w-3.5" /> Batalkan diterima
                </button>
              )}
              <button onClick={() => setShowNote(!showNote)} className="btn-ghost px-3 py-1.5 text-[11px]">
                <MessageSquare className="h-3.5 w-3.5" /> Catatan
              </button>
              {sub.contact && (
                <a
                  href={waFollowUp(sub.contact, followUpMessage({ name: sub.nickname, itemName: sub.item_name, qty: sub.qty_label || (sub.unit ? `satuan ${sub.unit}` : ""), eventTitle: sub.event_title, purpose: "pengajuan" }))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-3 py-1.5 text-[11px]"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
            </div>
            {sub.contact && (
              <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500">
                <Phone className="h-3 w-3" /> {sub.contact} <span className="font-normal text-stone-400">(hanya panitia)</span>
              </p>
            )}
            {showNote && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
                rows={2}
                placeholder="Catatan panitia (opsional), mis. instruksi penyerahan barang"
                className="input resize-none py-2 text-xs"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
