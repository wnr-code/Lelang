"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Lock, ArrowLeft } from "lucide-react";
import { loginAction } from "@/lib/actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-emerald-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Image
            src="/images/logo-cigatas.webp"
            alt="Logo Cigatas"
            width={1420}
            height={945}
            className="mx-auto h-20 w-auto"
            priority
          />
          <h1 className="mt-4 text-xl font-extrabold text-ink">Masuk Panitia</h1>
          <p className="mt-1 text-xs text-stone-500">Lelang Kebaikan Cigatas · Korwil Cigatas</p>
          <p className="text-[11px] italic text-emerald-700">Bersama dalam Kebaikan</p>
        </div>

        <form action={formAction} className="card mt-6 space-y-4 px-5 py-6">
          <div>
            <label className="label" htmlFor="password">Kata sandi panitia</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                id="password"
                name="password"
                type="password"
                required
                autoFocus
                placeholder="••••••••"
                className="input pl-10"
              />
            </div>
          </div>
          {state && !state.ok && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{state.error}</p>
          )}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Memeriksa..." : "Masuk"}
          </button>
          <p className="text-center text-[11px] leading-relaxed text-stone-400">
            Hanya panitia yang memiliki kata sandi. Anggota tidak perlu login untuk membantu.
          </p>
        </form>

        <Link href="/" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-emerald-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke situs publik
        </Link>
      </div>
    </div>
  );
}
