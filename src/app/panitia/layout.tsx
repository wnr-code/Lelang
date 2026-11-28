import Link from "next/link";
import Image from "next/image";
import { LogOut, Globe } from "lucide-react";
import { isPanitia } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";
import { getDashboardCounts } from "@/lib/queries";
import { NotifBell } from "@/components/notif-bell";
import { AdminNav } from "@/components/admin-nav";

export const dynamic = "force-dynamic";

export default async function PanitiaLayout({ children }: { children: React.ReactNode }) {
  const authed = await isPanitia();
  if (!authed) return <>{children}</>;
  const counts = await getDashboardCounts();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-stone-900/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/panitia" className="flex items-center gap-2.5">
            <Image src="/images/logo-cigatas.webp" alt="Cigatas" width={1420} height={945} className="h-10 w-auto" />
            <span className="leading-tight">
              <span className="block text-sm font-extrabold tracking-tight text-ink">CIGATAS</span>
              <span className="block text-[10px] font-semibold text-emerald-700">Dashboard Panitia</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <NotifBell count={counts.pending} href="/panitia/notifikasi" />
            <Link href="/" className="btn-ghost text-xs" title="Lihat situs publik">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Situs Publik</span>
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="btn-ghost text-xs text-rose-500" title="Keluar">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 sm:pb-6">{children}</main>
      <footer className="border-t border-stone-900/5 py-4 text-center text-[11px] text-stone-400">
        Lelang Kebaikan Cigatas · Satu Kepedulian, Banyak Kebaikan
      </footer>
      <AdminNav />
    </div>
  );
}
