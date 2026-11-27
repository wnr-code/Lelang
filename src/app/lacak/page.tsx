"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowLeft, Ticket } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/ui";

export default function TrackSearchPage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c) router.push(`/lacak/${encodeURIComponent(c)}`);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <Link href="/" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-emerald-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke papan
        </Link>
        <section className="card mt-3 px-5 py-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Ticket className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-extrabold text-ink">Lacak Pengajuan</h1>
              <p className="text-xs text-stone-400">Masukkan kode lacak yang kamu terima saat mengajukan bantuan.</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="mt-5 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="mis. CGT-ABC123"
              className="input flex-1 font-mono uppercase tracking-widest"
              maxLength={20}
              required
            />
            <button type="submit" className="btn-primary shrink-0">
              <Search className="h-4 w-4" /> Lacak
            </button>
          </form>
          <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
            Kode lacak bersifat pribadi — hanya kamu dan panitia yang bisa melihat detail pengajuanmu.
            Tanpa akun, tanpa login.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
