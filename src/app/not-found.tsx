import Link from "next/link";
import { HeartCrack, ArrowLeft } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <HeartCrack className="h-12 w-12 text-stone-300" />
        <h1 className="mt-4 text-xl font-extrabold text-ink">Halaman tidak ditemukan</h1>
        <p className="mt-2 max-w-sm text-sm text-stone-500">
          Mungkin link sudah berubah, atau kode lacak yang kamu masukkan salah. Coba periksa kembali.
        </p>
        <div className="mt-6 flex gap-2">
          <Link href="/" className="btn-primary text-xs"><ArrowLeft className="h-4 w-4" /> Ke Papan Utama</Link>
          <Link href="/lacak" className="btn-secondary text-xs">Lacak Pengajuan</Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
