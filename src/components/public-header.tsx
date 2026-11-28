import Link from "next/link";
import { UserRound } from "lucide-react";
import { NotifBell } from "@/components/notif-bell";
import { BrandMark } from "@/components/ui";
import { getMemberNotifications } from "@/lib/notifications";

/** Header publik: logo + lonceng notifikasi nyata (badge & daftar) + profil. */
export async function PublicHeader({ notif }: { notif?: number } = {}) {
  // Badge & daftar notifikasi diambil dari data nyata (acara aktif, pengajian, arsip).
  let items: Awaited<ReturnType<typeof getMemberNotifications>> = [];
  try {
    items = await getMemberNotifications();
  } catch {
    items = [];
  }
  const count = notif ?? items.filter((i) => i.fresh).length;
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-900/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[70px] max-w-3xl items-center gap-1 px-4">
        <div className="min-w-0 flex-1">
          <BrandMark />
        </div>
        <NotifBell count={count} items={items} href="/notifikasi" label="Notifikasi kegiatan" />
        <Link
          href="/pengaturan"
          aria-label="Profil & pengaturan"
          title="Profil & pengaturan"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-200"
        >
          <UserRound className="h-5 w-5" strokeWidth={2} />
        </Link>
      </div>
    </header>
  );
}

