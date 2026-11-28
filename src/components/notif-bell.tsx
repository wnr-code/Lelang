import Link from "next/link";
import { Bell } from "lucide-react";

/** Lonceng notifikasi + badge angka. Dipakai di header anggota maupun panitia. */
export function NotifBell({ count, href, label = "Notifikasi" }: { count: number; href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={count > 0 ? `${label}: ${count} perlu perhatian` : label}
      title={label}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-emerald-800 transition hover:bg-emerald-50"
    >
      <Bell className="h-[22px] w-[22px]" strokeWidth={1.9} />
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold leading-none text-white ring-2 ring-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
