import Link from "next/link";
import { ChevronDown, Globe } from "lucide-react";
import { isPanitia } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";
import { getDashboardCounts } from "@/lib/queries";
import { BrandMark, Avatar } from "@/components/ui";
import { NotifBell } from "@/components/notif-bell";
import { AdminNav, AdminSidebar } from "@/components/admin-nav";

export const dynamic = "force-dynamic";

export default async function PanitiaLayout({ children }: { children: React.ReactNode }) {
  const authed = await isPanitia();
  if (!authed) return <>{children}</>;
  const counts = await getDashboardCounts();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-emerald-900/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[74px] max-w-6xl items-center gap-2 px-4">
          <div className="min-w-0 flex-1">
            <BrandMark href="/panitia" />
          </div>
          <NotifBell count={counts.pending} href="/panitia/notifikasi" label="Pengajuan menunggu" />
          <Link
            href="/"
            title="Lihat situs anggota"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-emerald-800 transition hover:bg-emerald-50 sm:flex"
          >
            <Globe className="h-5 w-5" strokeWidth={1.9} />
          </Link>
          <Link
            href="/panitia/pengaturan"
            className="flex shrink-0 items-center gap-2 rounded-full bg-white py-1 pl-1 pr-2.5 ring-1 ring-emerald-900/10 transition hover:bg-emerald-50"
          >
            <span className="relative">
              <Avatar name="Admin Panitia" className="h-9 w-9 text-[12px]" />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </span>
            <span className="hidden text-[12px] font-extrabold leading-tight text-ink sm:block">
              Admin<br />Panitia
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-5 px-4 py-5">
        <AdminSidebar pendingCount={counts.pending} proposalCount={counts.proposalsPending} logoutAction={logoutAction} />
        <main className="min-w-0 flex-1 pb-24 lg:pb-8">{children}</main>
      </div>

      <footer className="relative overflow-hidden bg-gradient-to-r from-emerald-800 to-emerald-700 px-4 pb-24 pt-6 text-center text-white lg:pb-6">
        <span className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full bg-emerald-600/30" />
        <span className="pointer-events-none absolute -bottom-8 -right-6 h-28 w-28 rounded-full bg-gold/15" />
        <p className="relative text-[22px] leading-relaxed" dir="rtl" lang="ar">اللهُ يَجْزِيكُمْ خَيْرًا</p>
        <p className="relative mt-1 text-[12px] italic text-emerald-100">“Semoga Allah membalas kebaikan Anda”</p>
        <p className="relative mt-2 text-[11px] text-emerald-200/80">Lelang Kebaikan Cigatas · Korwil Cigatas · Bersama dalam Kebaikan</p>
      </footer>
      <AdminNav pendingCount={counts.pending} proposalCount={counts.proposalsPending} logoutAction={logoutAction} />
    </div>
  );
}
