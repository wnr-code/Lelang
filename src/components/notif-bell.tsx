import Link from "next/link";
import { Bell } from "lucide-react";

export function NotifBell({ count, href }: { count: number; href: string }) {
  return (
    <Link
      href={href}
      aria-label="Notifikasi"
      className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white text-stone-600 ring-1 ring-stone-200 transition hover:text-emerald-700"
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
