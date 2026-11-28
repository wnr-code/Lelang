"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Heart, ClipboardList, Settings } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/#kegiatan", label: "Kegiatan", icon: Heart },
  { href: "/arsip", label: "Riwayat", icon: ClipboardList },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
];

/** Navigasi bawah anggota (Android). Sembunyi di area panitia. */
export function MobileNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/panitia")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-900/10 bg-white/95 backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-3xl items-stretch justify-around px-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : href === "/#kegiatan"
                ? pathname.startsWith("/kegiatan")
                : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-bold transition ${active ? "text-emerald-700" : "text-stone-400"}`}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.3 : 1.9} />
              {label}
              <span className={`h-[3px] w-7 rounded-full ${active ? "bg-emerald-600" : "bg-transparent"}`} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
