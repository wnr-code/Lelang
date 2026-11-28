"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Check, X, Pencil, MessageCircle, Loader2 } from "lucide-react";
import { decideProposalAction, updateProposalAction } from "@/lib/actions";
import { ProposalStatusChip, Avatar, formatDate } from "@/components/ui";
import { ITEM_CATEGORY_LABEL, ITEM_CATEGORY_ORDER, UNIT_OPTIONS } from "@/lib/types";
import type { ProposalJoined } from "@/lib/queries";

/** Panel admin: tinjau usulan item baru — setujui (jadi kebutuhan resmi), tolak, atau ubah. */
export function PanitiaProposals({ proposals }: { proposals: ProposalJoined[] }) {
  if (proposals.length === 0) {
    return (
      <div className="card px-5 py-10 text-center">
        <Lightbulb className="mx-auto h-8 w-8 text-emerald-200" />
        <p className="mt-2 text-sm font-bold text-stone-600">Belum ada usulan item</p>
        <p className="text-xs text-stone-400">Usulan barang baru dari anggota akan muncul di sini.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {proposals.map((p) => <ProposalCard key={p.id} p={p} />)}
    </div>
  );
}

function ProposalCard({ p }: { p: ProposalJoined }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState(p.name);
  const [targetLabel, setTargetLabel] = useState(p.qty_label || (p.qty != null ? `${p.qty}${p.unit ? " " + p.unit : ""}` : "Secukupnya"));
  const [unit, setUnit] = useState(p.unit);
  const [category, setCategory] = useState(p.category);
  const [noteItem, setNoteItem] = useState(p.note);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error || "Gagal memproses.");
      else router.refresh();
    });
  }

  function decide(decision: "approved" | "rejected") {
    const fd = new FormData();
    fd.set("id", String(p.id));
    fd.set("decision", decision);
    fd.set("note", note);
    if (decision === "approved") {
      fd.set("name", name);
      fd.set("target_label", targetLabel);
      fd.set("unit", unit);
      fd.set("category", category);
      fd.set("note_item", noteItem);
    }
    run(() => decideProposalAction(null, fd));
  }

  function saveEdit() {
    const fd = new FormData();
    fd.set("id", String(p.id));
    fd.set("name", name);
    fd.set("qty_label", targetLabel);
    fd.set("unit", unit);
    fd.set("category", category);
    fd.set("note", noteItem);
    run(() => updateProposalAction(null, fd).then((r) => { if (r.ok) setEditing(false); return r; }));
  }

  const waDigits = p.contact.replace(/\D/g, "");

  return (
    <div className="card px-5 py-4">
      <div className="flex items-start gap-3">
        <Avatar name={p.nickname} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-extrabold text-ink">{p.name}</p>
            <ProposalStatusChip status={p.status} />
          </div>
          <p className="mt-0.5 text-[12px] text-stone-500">
            {p.qty_label || (p.qty != null ? String(p.qty) : "Secukupnya")}{p.unit ? ` ${p.unit}` : ""} · {ITEM_CATEGORY_LABEL[p.category]} · {p.event_title}
          </p>
          <p className="mt-0.5 text-[12px] text-stone-400">
            Oleh <b className="text-stone-600">{p.nickname}</b> · {formatDate(p.created_at)} · kode {p.track_code}
          </p>
          {p.note && <p className="mt-1 text-[12px] italic leading-relaxed text-stone-500">“{p.note}”</p>}
          {p.contact && (
            <a href={`https://wa.me/${waDigits.startsWith("0") ? "62" + waDigits.slice(1) : waDigits}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] font-bold text-emerald-700">
              <MessageCircle className="h-3.5 w-3.5" /> {p.contact}
            </a>
          )}
        </div>
      </div>

      {p.status === "pending" && (
        <div className="mt-3 border-t border-stone-100 pt-3">
          {editing && (
            <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-emerald-50/60 p-3 ring-1 ring-emerald-100">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="input col-span-2 py-2 text-xs" placeholder="Nama item" />
              <input value={targetLabel} onChange={(e) => setTargetLabel(e.target.value)} maxLength={80} className="input py-2 text-xs" placeholder="Target (mis. 4 Lembar)" />
              <input value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={30} className="input py-2 text-xs" placeholder="Satuan" list="unit-proposal" />
              <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="input col-span-2 py-2 text-xs">
                {ITEM_CATEGORY_ORDER.map((c) => <option key={c} value={c}>{ITEM_CATEGORY_LABEL[c]}</option>)}
              </select>
              <textarea value={noteItem} onChange={(e) => setNoteItem(e.target.value)} maxLength={1000} rows={2} className="input col-span-2 resize-none py-2 text-xs" placeholder="Keterangan item" />
              <datalist id="unit-proposal">{UNIT_OPTIONS.map((u) => <option key={u} value={u} />)}</datalist>
              <button onClick={saveEdit} disabled={pending} className="btn-secondary col-span-2 py-2 text-xs">Simpan Perubahan Usulan</button>
            </div>
          )}
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="input mb-2 py-2 text-xs" placeholder="Catatan keputusan (opsional, terlihat pengusul)" />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => decide("approved")} disabled={pending} className="btn-primary px-4 py-2 text-xs">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Setujui & Jadikan Kebutuhan
            </button>
            <button onClick={() => decide("rejected")} disabled={pending} className="btn-danger px-4 py-2 text-xs">
              <X className="h-4 w-4" /> Tolak
            </button>
            <button onClick={() => setEditing((v) => !v)} disabled={pending} className="btn-ghost px-3 py-2 text-xs">
              <Pencil className="h-4 w-4" /> {editing ? "Tutup Edit" : "Ubah"}
            </button>
          </div>
        </div>
      )}

      {p.status !== "pending" && p.decision_note && (
        <p className="mt-2 rounded-lg bg-stone-50 px-3 py-2 text-[12px] italic text-stone-500">Catatan: “{p.decision_note}”</p>
      )}
      {error && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}
