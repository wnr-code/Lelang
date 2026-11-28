"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Archive, Info } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/#kegiatan", label: "Kegiatan", icon: CalendarDays },
  { href: "/arsip", label: "Riwayat", icon: Archive },
  { href: "/tentang", label: "Informasi", icon: Info },
];

export function MobileNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/panitia")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-900/10 bg-white/95 backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-3xl items-stretch justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href.split("#")[0]) && href !== "/";
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold ${
                active ? "text-emerald-700" : "text-stone-400"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "fill-emerald-100" : ""}`} />
              {label}
              <span className={`h-0.5 w-6 rounded-full ${active ? "bg-emerald-600" : "bg-transparent"}`} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
