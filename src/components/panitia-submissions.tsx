"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, MessageSquare, Phone, Clock3, HelpCircle, CheckCheck, Package, HandHeart } from "lucide-react";
import { decideSubmissionAction } from "@/lib/actions";
import { SubmissionStatusChip } from "@/components/ui";
import { SUBMISSION_STATUS_LABEL } from "@/lib/types";
import type { SubmissionRow, SubmissionStatus } from "@/lib/types";

type SubWithMeta = SubmissionRow & { item_name: string; event_title: string; event_slug: string; item_kind?: string };

const ACTIONS: Record<SubmissionStatus, SubmissionStatus[]> = {
  pending: ["approved", "needs_confirmation", "rejected"],
  needs_confirmation: ["approved", "rejected"],
  approved: ["done", "rejected"],
  rejected: ["approved"],
  done: [],
};

function waLink(contact: string): string {
  const digits = contact.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? "62" + digits.slice(1) : digits;
  return `https://wa.me/${intl}`;
}

export function SubmissionCard({ sub }: { sub: SubWithMeta }) {
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  const isTenaga = sub.item_kind === "tenaga";
  const actions = ACTIONS[sub.status] ?? [];

  function decide(decision: SubmissionStatus) {
    setError("");
    startTransition(async () => {
      const res = await decideSubmissionAction(sub.id, decision, note);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className={`card px-5 py-4 ${sub.status === "pending" ? "ring-amber-200" : sub.status === "needs_confirmation" ? "ring-sky-200" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-ink">
            {sub.nickname} <span className="font-semibold text-stone-400">· {sub.item_name}</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`chip ${isTenaga ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-800"}`}>
              {isTenaga ? <HandHeart className="h-3 w-3" /> : <Package className="h-3 w-3" />}
              {isTenaga ? "Tenaga" : "Barang"}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              {sub.qty_label || "Secukupnya"}{sub.unit && !sub.qty_label.includes(sub.unit) ? ` (${sub.unit})` : ""}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-stone-400">{sub.event_title} · {formatDateTime(sub.created_at)}</p>
        </div>
        <SubmissionStatusChip status={sub.status} />
      </div>

      {sub.availability && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800">
          <Clock3 className="h-3.5 w-3.5" /> Waktu tersedia: {sub.availability}
        </p>
      )}

      {sub.message && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-600">
          <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" /> {sub.message}
        </p>
      )}
      {sub.contact && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500">
            <Phone className="h-3.5 w-3.5" /> {sub.contact}
          </span>
          <a href={waLink(sub.contact)} target="_blank" rel="noopener" className="chip bg-emerald-600 text-white">
            Hubungi WhatsApp
          </a>
        </div>
      )}
      {sub.decision_note && sub.status !== "pending" && (
        <p className="mt-2 rounded-lg bg-stone-50 px-3 py-2 text-xs italic text-stone-500">Catatan: “{sub.decision_note}”</p>
      )}

      {actions.length > 0 && (
        <div className="mt-3">
          {showNote && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="Catatan untuk anggota (opsional), mis. instruksi penyerahan barang"
              className="input mb-2 resize-none py-2 text-xs"
            />
          )}
          <div className="flex flex-wrap gap-2">
            {actions.includes("approved") && (
              <button disabled={pending} onClick={() => decide("approved")} className="btn-primary px-4 py-2 text-xs">
                <Check className="h-3.5 w-3.5" /> Setujui
              </button>
            )}
            {actions.includes("needs_confirmation") && (
              <button disabled={pending} onClick={() => decide("needs_confirmation")} className="btn-secondary px-4 py-2 text-xs">
                <HelpCircle className="h-3.5 w-3.5" /> Perlu konfirmasi
              </button>
            )}
            {actions.includes("done") && (
              <button disabled={pending} onClick={() => decide("done")} className="btn-primary px-4 py-2 text-xs">
                <CheckCheck className="h-3.5 w-3.5" /> Selesai (sudah diterima)
              </button>
            )}
            {actions.includes("rejected") && (
              <button disabled={pending} onClick={() => decide("rejected")} className="btn-danger px-4 py-2 text-xs">
                <X className="h-3.5 w-3.5" /> Tolak
              </button>
            )}
            <button onClick={() => setShowNote(!showNote)} className="btn-ghost px-3 py-2 text-xs">
              <MessageSquare className="h-3.5 w-3.5" /> Catatan
            </button>
          </div>
          {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
          <p className="mt-2 text-[12px] leading-relaxed text-stone-400">
            {sub.status === "approved"
              ? "Disetujui belum berarti diterima. Tandai Selesai setelah barang/tenaga benar-benar diterima, atau verifikasi di menu Kelola Barang."
              : "Menyetujui mencatat kesediaan di menu Kelola Barang (belum diterima). Penanggung jawab ditetapkan di sana."}
          </p>
        </div>
      )}

      {sub.status === "done" && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-800">
          {SUBMISSION_STATUS_LABEL.done}: bantuan sudah diverifikasi panitia dan tercatat diterima.
        </p>
      )}
    </div>
  );
}

function formatDateTime(s: string): string {
  const d = new Date(s.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) + " " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
