import Link from "next/link";
import { redirect } from "next/navigation";
import { HandHeart, LayoutDashboard, CalendarPlus, Inbox, PackageCheck, Recycle, LogOut, Globe } from "lucide-react";
import { isPanitia } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/panitia", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/panitia/kegiatan", label: "Kelola Kegiatan", icon: CalendarPlus },
  { href: "/panitia/pengajuan", label: "Pengajuan", icon: Inbox },
  { href: "/panitia/barang", label: "Barang & PJ", icon: PackageCheck },
  { href: "/panitia/laporan", label: "Laporan & Sisa", icon: Recycle },
];

export default async function PanitiaLayout({ children }: { children: React.ReactNode }) {
  const authed = await isPanitia();
  // Halaman login menangani dirinya sendiri; layout hanya membungkus.
  if (!authed) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-stone-900/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/panitia" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <HandHeart className="h-4 w-4" />
            </span>
            <span className="text-sm font-extrabold tracking-tight text-ink">Pusat Kendali Panitia</span>
          </Link>
          <div className="flex items-center gap-1">
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
        <nav className="mx-auto max-w-5xl overflow-x-auto px-4 pb-2">
          <div className="flex gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-stone-500 transition hover:bg-emerald-50 hover:text-emerald-700"
              >
                <n.icon className="h-3.5 w-3.5" />
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-stone-900/5 py-4 text-center text-[11px] text-stone-400">
        Lelang Kebaikan Cigatas · Satu Kepedulian, Banyak Kebaikan
      </footer>
    </div>
  );
}
