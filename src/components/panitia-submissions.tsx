"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, MessageSquare, Phone, Clock3 } from "lucide-react";
import { decideSubmissionAction } from "@/lib/actions";
import { SubmissionStatusChip } from "@/components/ui";
import type { SubmissionRow } from "@/lib/types";

type SubWithMeta = SubmissionRow & { item_name: string; event_title: string; event_slug: string };

export function SubmissionCard({ sub }: { sub: SubWithMeta }) {
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  function decide(decision: "approved" | "rejected") {
    setError("");
    startTransition(async () => {
      const res = await decideSubmissionAction(sub.id, decision, note);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className={`card px-5 py-4 ${sub.status === "pending" ? "ring-amber-200" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-ink">
            {sub.nickname} <span className="font-semibold text-stone-400">· {sub.item_name}</span>
          </p>
          <p className="mt-0.5 text-xs font-bold text-emerald-700">{sub.qty_label || "Secukupnya"}</p>
          <p className="mt-0.5 text-[11px] text-stone-400">{sub.event_title} · {formatDateTime(sub.created_at)}</p>
        </div>
        <SubmissionStatusChip status={sub.status} />
      </div>

      {sub.message && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-600">
          <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" /> {sub.message}
        </p>
      )}
      {sub.contact && (
        <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-stone-500">
          <Phone className="h-3.5 w-3.5" /> {sub.contact}
        </p>
      )}
      {sub.decision_note && sub.status !== "pending" && (
        <p className="mt-2 rounded-lg bg-stone-50 px-3 py-2 text-xs italic text-stone-500">Catatan: “{sub.decision_note}”</p>
      )}

      {sub.status === "pending" && (
        <div className="mt-3">
          {showNote && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Catatan untuk anggota (opsional), mis. instruksi penyerahan barang"
              className="input mb-2 resize-none py-2 text-xs"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <button disabled={pending} onClick={() => decide("approved")} className="btn-primary px-4 py-2 text-xs">
              <Check className="h-3.5 w-3.5" /> Setujui
            </button>
            <button disabled={pending} onClick={() => decide("rejected")} className="btn-danger px-4 py-2 text-xs">
              <X className="h-3.5 w-3.5" /> Tolak
            </button>
            <button onClick={() => setShowNote(!showNote)} className="btn-ghost px-3 py-2 text-xs">
              <MessageSquare className="h-3.5 w-3.5" /> Catatan
            </button>
          </div>
          {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
          <p className="mt-2 text-[11px] text-stone-400">
            Menyetujui otomatis mencatat kesediaan di menu Barang & PJ. Penanggung jawab ditetapkan terpisah di sana.
          </p>
        </div>
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
