"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Send, X } from "lucide-react";
import { submitProposalAction } from "@/lib/actions";
import { NICKNAME_KEY, CONTACT_KEY } from "@/components/member-settings";
import { UNIT_OPTIONS, ITEM_CATEGORY_LABEL, ITEM_CATEGORY_ORDER } from "@/lib/types";
import { AntiSpamFields } from "@/components/anti-spam";
import { SubmissionSuccess } from "@/components/submission-success";

/** Form usulan item baru dari anggota (tanpa login). Masuk panel admin menunggu persetujuan. */
export function ProposalForm({ eventId, panitiaWa = "" }: { eventId: number; panitiaWa?: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [contact, setContact] = useState("");
  const [itemName, setItemName] = useState("");
  const router = useRouter();

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
    fd.set("event_id", String(eventId));
    startTransition(async () => {
      const res = await submitProposalAction(null, fd);
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

  if (code) {
    return (
      <SubmissionSuccess
        code={code}
        kind="usulan"
        itemName={itemName}
        nickname={nickname}
        panitiaWa={panitiaWa}
        onClose={() => { setCode(""); setOpen(false); }}
      />
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary w-full">
        <Lightbulb className="h-4 w-4" /> Usulkan Item Baru
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative rounded-2xl bg-cream/70 p-4 ring-1 ring-gold/30">
      <AntiSpamFields />
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
            <Lightbulb className="h-4 w-4 text-gold" /> Usulkan Item Baru
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-stone-500">
            Barang belum ada di daftar? Usulkan di sini. Panitia meninjau dulu sebelum jadi kebutuhan resmi.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2 py-1" aria-label="Tutup form">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="label" htmlFor="prop-name">Nama barang yang diusulkan</label>
          <input id="prop-name" name="name" required maxLength={100} value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="mis. Terpal / Tikar Bambu" className="input" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="prop-qty">Jumlah</label>
            <input id="prop-qty" name="qty" type="number" min="0.1" step="any" placeholder="mis. 4" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="prop-unit">Satuan</label>
            <select id="prop-unit" name="unit" defaultValue="Pcs" className="input">
              {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="prop-qtylabel">Atau keterangan jumlah (opsional)</label>
          <input id="prop-qtylabel" name="qty_label" maxLength={80} placeholder="mis. Secukupnya / 2 gulung" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="prop-cat">Kategori</label>
          <select id="prop-cat" name="category" defaultValue="barang" className="input">
            {ITEM_CATEGORY_ORDER.map((c) => <option key={c} value={c}>{ITEM_CATEGORY_LABEL[c]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="prop-nick">Nama panggilan (Ikhwan/Akhwat)</label>
          <input id="prop-nick" name="nickname" required maxLength={80} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Nama Ikhwan/Akhwat" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="prop-note">Keterangan</label>
          <textarea id="prop-note" name="note" maxLength={1000} rows={2} placeholder="mis. Untuk alas duduk jamaah, bisa saya pinjamkan" className="input resize-none" />
        </div>
        <div>
          <label className="label" htmlFor="prop-contact">Nomor WhatsApp (opsional)</label>
          <input id="prop-contact" name="contact" type="tel" inputMode="tel" maxLength={80} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="mis. 0812xxxx (bila perlu dihubungi)" className="input" />
        </div>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Mengirim..." : <><Send className="h-4 w-4" /> Kirim Usulan</>}
        </button>
        <p className="text-center text-[12px] text-stone-400">
          Usulan tidak otomatis jadi kebutuhan resmi — menunggu persetujuan panitia.
        </p>
      </div>
    </form>
  );
}
