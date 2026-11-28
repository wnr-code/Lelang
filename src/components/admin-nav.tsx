"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home, CalendarDays, ClipboardList, Package, Gift, BarChart3, Settings, LogOut,
} from "lucide-react";

const ITEMS = [
  { href: "/panitia", label: "Dashboard", icon: Home },
  { href: "/panitia/kegiatan", label: "Kelola Kegiatan", icon: CalendarDays },
  { href: "/panitia/pengajuan", label: "Kelola Pengajuan", icon: ClipboardList, badge: true },
  { href: "/panitia/kebutuhan", label: "Kelola Kebutuhan", icon: Package },
  { href: "/panitia/barang", label: "Kelola Barang", icon: Gift },
  { href: "/panitia/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/panitia/pengaturan", label: "Pengaturan", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/panitia" ? pathname === "/panitia" : pathname.startsWith(href);
}

/** Sidebar panitia (layar besar) — meniru tata letak referensi Android. */
export function AdminSidebar({
  pendingCount,
  logoutAction,
}: {
  pendingCount: number;
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-[236px] shrink-0 lg:block">
      <div className="sticky top-[86px] overflow-hidden rounded-[22px] bg-white shadow-[0_6px_20px_rgba(7,91,53,0.07)] ring-1 ring-emerald-900/5">
        <nav className="space-y-1 p-3">
          {ITEMS.map(({ href, label, icon: Icon, badge }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[14px] font-bold transition ${
                  active
                    ? "bg-gradient-to-r from-emerald-800 to-emerald-600 text-white shadow-md shadow-emerald-800/20"
                    : "text-ink hover:bg-emerald-50"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-white" : "text-emerald-700"}`} strokeWidth={2} />
                <span className="flex-1 truncate">{label}</span>
                {badge && pendingCount > 0 && (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-extrabold text-white">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-[14px] font-bold text-ink transition hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0 text-emerald-700" strokeWidth={2} />
              Logout
            </button>
          </form>
        </nav>
        <div className="relative">
          <Image
            src="/images/sidebar-mosque.webp"
            alt="Ilustrasi masjid dan dedaunan hijau"
            width={700}
            height={938}
            className="h-auto w-full"
          />
          <p className="absolute inset-x-0 bottom-[26%] text-center text-[14px] font-bold italic leading-snug text-emerald-800">
            Bersama dalam<br />Kebaikan
          </p>
        </div>
      </div>
    </aside>
  );
}

/** Navigasi bawah panitia (layar kecil / Android). */
export function AdminNav({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();
  if (!pathname.startsWith("/panitia") || pathname.startsWith("/panitia/login")) return null;
  const items = ITEMS.filter((i) => i.href !== "/panitia/kebutuhan" && i.href !== "/panitia/pengaturan");
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-900/10 bg-white/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-3xl items-stretch justify-around px-1">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(pathname, href);
          const short = label.replace("Kelola ", "");
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-bold transition ${active ? "text-emerald-700" : "text-stone-400"}`}
            >
              <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.3 : 1.9} />
              {short}
              <span className={`h-[3px] w-6 rounded-full ${active ? "bg-emerald-600" : "bg-transparent"}`} />
              {badge && pendingCount > 0 && (
                <span className="absolute right-[22%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white ring-2 ring-white">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
