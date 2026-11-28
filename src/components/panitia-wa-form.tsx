"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Loader2, Check } from "lucide-react";
import { setPanitiaWaAction } from "@/lib/actions";

/** Setel nomor WhatsApp panitia untuk tombol konfirmasi pengajuan/usulan anggota. */
export function PanitiaWaForm({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setError("");
    const fd = new FormData();
    fd.set("panitia_wa", value);
    startTransition(async () => {
      const r = await setPanitiaWaAction(null, fd);
      if (r.ok) { setMsg("Nomor tersimpan."); router.refresh(); }
      else setError(r.error);
    });
  }

  return (
    <form onSubmit={save} className="space-y-2">
      <label className="label" htmlFor="panitia-wa">Nomor WhatsApp panitia</label>
      <div className="flex gap-2">
        <input
          id="panitia-wa"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          type="tel"
          inputMode="tel"
          maxLength={20}
          placeholder="mis. 0812xxxx atau 62812xxxx"
          className="input flex-1"
        />
        <button type="submit" disabled={pending} className="btn-primary shrink-0 px-4 py-2 text-xs">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Simpan
        </button>
      </div>
      <p className="text-[12px] leading-relaxed text-stone-400">
        Dipakai tombol “Konfirmasi via WhatsApp” setelah anggota mengirim pengajuan/usulan. Kosongkan bila ingin anggota memilih kontak/grup sendiri.
      </p>
      {msg && <p className="text-[12px] font-semibold text-emerald-700">{msg}</p>}
      {error && <p className="text-[12px] font-semibold text-rose-600">{error}</p>}
    </form>
  );
}
