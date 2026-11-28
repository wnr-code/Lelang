"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, X, Package, HandHeart, Clock3 } from "lucide-react";
import { submitHelpAction } from "@/lib/actions";
import { NICKNAME_KEY, CONTACT_KEY } from "@/components/member-settings";
import { UNIT_OPTIONS } from "@/lib/types";
import { AntiSpamFields } from "@/components/anti-spam";
import { SubmissionSuccess } from "@/components/submission-success";
import type { ItemWithStatus } from "@/lib/types";

export function HelpForm({ item, eventSlug, panitiaWa = "" }: { item: ItemWithStatus; eventSlug: string; panitiaWa?: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [nickname, setNickname] = useState("");
  const [contact, setContact] = useState("");
  const router = useRouter();

  const isTenaga = item.kind === "tenaga";
  const hasNumericTarget = item.target_qty != null;
  const unitChoices = [...new Set([item.unit, ...UNIT_OPTIONS].filter(Boolean))];

  // Prefill dari Pengaturan (tersimpan di perangkat anggota, bukan di server).
  useEffect(() => {
    try {
      setNickname(localStorage.getItem(NICKNAME_KEY) || "");
      setContact(localStorage.getItem(CONTACT_KEY) || "");
    } catch {}
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("item_id", String(item.id));
    startTransition(async () => {
      const res = await submitHelpAction(null, fd);
      if (res.ok) {
        setCode(res.code || "");
        try {
          localStorage.setItem(NICKNAME_KEY, nickname.trim().slice(0, 80));
          localStorage.setItem(CONTACT_KEY, contact.trim().slice(0, 80));
        } catch {}
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
      <SubmissionSuccess
        code={code}
        kind="infaq"
        itemName={item.name}
        nickname={nickname}
        panitiaWa={panitiaWa}
        onClose={() => { setCode(""); setOpen(false); }}
      />
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary w-full">
        {isTenaga ? <HandHeart className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        {isTenaga ? "Saya Siap Membantu Tenaga" : "Saya Ingin Membantu"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative rounded-2xl bg-emerald-50/60 p-4 ring-1 ring-emerald-100">
      <AntiSpamFields />
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-ink">{isTenaga ? "Bantuan Tenaga" : "Infaq Barang"}: {item.name}</p>
          <span className="chip mt-1 bg-white text-emerald-700 ring-1 ring-emerald-200">
            {isTenaga ? <HandHeart className="h-3 w-3" /> : <Package className="h-3 w-3" />}
            {isTenaga ? "Tenaga / kesediaan" : "Barang / sembako"}
          </span>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2 py-1" aria-label="Tutup form">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="label" htmlFor={`nickname-${item.id}`}>Nama panggilan (Ikhwan/Akhwat)</label>
          <input
            id={`nickname-${item.id}`}
            name="nickname"
            required
            maxLength={80}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nama Ikhwan/Akhwat"
            className="input"
          />
        </div>

        {isTenaga ? (
          <>
            <div>
              <label className="label">Jenis bantuan</label>
              <p className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">{item.name}</p>
              {item.note && <p className="mt-1 text-[12px] text-stone-400">{item.note}</p>}
            </div>
            <div>
              <label className="label" htmlFor={`avail-${item.id}`}>Waktu ketersediaan (wajib)</label>
              <input
                id={`avail-${item.id}`}
                name="availability"
                required
                maxLength={150}
                placeholder="mis. Sabtu, 07.00–12.00 WIB"
                className="input"
              />
              <p className="mt-1 flex items-center gap-1 text-[12px] text-stone-400">
                <Clock3 className="h-3 w-3" /> Tulis hari & jam agar panitia bisa mengatur jadwal.
              </p>
            </div>
            <div>
              <label className="label" htmlFor={`qty-${item.id}`}>Jumlah orang (opsional)</label>
              <input id={`qty-${item.id}`} name="qty" type="number" min="1" step="1" placeholder="mis. 1" className="input" />
              <input type="hidden" name="unit" value="Orang" />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label" htmlFor={`qty-${item.id}`}>Jumlah barang</label>
                {hasNumericTarget ? (
                  <input id={`qty-${item.id}`} name="qty" type="number" min="0.1" step="any" required placeholder="mis. 5" className="input" />
                ) : (
                  <input id={`qty-${item.id}`} name="qty_label" required maxLength={80} placeholder="mis. 2 dus" className="input" />
                )}
              </div>
              <div>
                <label className="label" htmlFor={`unit-${item.id}`}>Satuan</label>
                <select id={`unit-${item.id}`} name="unit" defaultValue={item.unit || "Kg"} className="input">
                  {unitChoices.map((u) => <option key={u} value={u}>{u}</option>)}
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>
            <p className="-mt-1 text-[12px] text-stone-400">
              Target: {item.target_label}. Tidak harus penuh — sekecil apa pun berarti. Contoh: Beras 5 kg, Minyak goreng 2 liter, Kopi 2 dus.
            </p>
          </>
        )}

        <div>
          <label className="label" htmlFor={`message-${item.id}`}>Catatan (opsional)</label>
          <textarea
            id={`message-${item.id}`}
            name="message"
            maxLength={2000}
            rows={2}
            placeholder={isTenaga ? "mis. Bisa bantu masak dan bersih-bersih" : "mis. Siap diantar Sabtu sore"}
            className="input resize-none"
          />
        </div>

        <div>
          <label className="label" htmlFor={`contact-${item.id}`}>Nomor WhatsApp (wajib)</label>
          <input
            id={`contact-${item.id}`}
            name="contact"
            type="tel"
            inputMode="tel"
            required
            maxLength={80}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="mis. 0812xxxx (untuk follow up panitia)"
            className="input"
          />
          <p className="mt-1 text-[12px] text-stone-400">Wajib diisi agar panitia bisa menghubungimu. Hanya terlihat oleh panitia.</p>
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Mengirim..." : "Kirim Pengajuan"}
        </button>
        <p className="text-center text-[12px] text-stone-400">
          Pengajuan belum dihitung sebagai diterima sampai panitia memverifikasi.
        </p>
      </div>
    </form>
  );
}
