"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, Check, Send, X } from "lucide-react";
import { submitHelpAction } from "@/lib/actions";
import type { ItemWithStatus } from "@/lib/types";

export function HelpForm({ item, eventSlug }: { item: ItemWithStatus; eventSlug: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const hasNumericTarget = item.target_qty != null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("item_id", String(item.id));
    startTransition(async () => {
      const res = await submitHelpAction(null, fd);
      if (res.ok) {
        setCode(res.code || "");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (code) {
    return (
      <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-emerald-900">Pengajuan terkirim!</p>
            <p className="mt-1 text-xs leading-relaxed text-emerald-800">
              Panitia akan meninjau pengajuanmu. Simpan kode ini untuk melacak statusnya:
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="rounded-lg bg-white px-3 py-2 text-base font-extrabold tracking-widest text-emerald-700 ring-1 ring-emerald-200">{code}</code>
              <button onClick={copyCode} className="btn-ghost text-emerald-700" aria-label="Salin kode">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <a href={`/lacak/${code}`} className="btn-primary mt-3 w-full text-xs">
              Lacak Pengajuanku
            </a>
            <button onClick={() => { setCode(""); setOpen(false); }} className="mt-2 w-full text-center text-xs font-semibold text-emerald-700 hover:underline">
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        <Send className="h-4 w-4" /> Saya Ingin Membantu
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-extrabold text-ink">Bantu: {item.name}</p>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2 py-1" aria-label="Tutup form">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="label" htmlFor={`nickname-${item.id}`}>Nama panggilan</label>
          <input id={`nickname-${item.id}`} name="nickname" required maxLength={40} placeholder="mis. Kang Asep" className="input" />
        </div>
        <div>
          <label className="label" htmlFor={`qty-${item.id}`}>
            Jumlah kesediaan {hasNumericTarget && item.unit ? `(${item.unit})` : ""}
          </label>
          {hasNumericTarget ? (
            <input id={`qty-${item.id}`} name="qty" type="number" min="0.1" step="any" required placeholder={item.unit ? `mis. 5 ${item.unit}` : "mis. 5"} className="input" />
          ) : (
            <input id={`qty-${item.id}`} name="qty_label" required maxLength={40} placeholder="mis. 2 dus / secukupnya" className="input" />
          )}
          <p className="mt-1 text-[11px] text-stone-400">Target: {item.target_label}. Tidak harus penuh — sekecil apa pun berarti.</p>
        </div>
        <div>
          <label className="label" htmlFor={`message-${item.id}`}>Pesan untuk panitia (opsional)</label>
          <textarea id={`message-${item.id}`} name="message" maxLength={300} rows={2} placeholder="mis. Siap diantar Sabtu sore" className="input resize-none" />
        </div>
        <div>
          <label className="label" htmlFor={`contact-${item.id}`}>Kontak WA (opsional)</label>
          <input id={`contact-${item.id}`} name="contact" maxLength={60} placeholder="mis. 0812xxxx (hanya untuk panitia)" className="input" />
        </div>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Mengirim..." : "Kirim Pengajuan"}
        </button>
        <p className="text-center text-[11px] text-stone-400">Keputusan penerima & penanggung jawab ada di panitia.</p>
      </div>
    </form>
  );
}
