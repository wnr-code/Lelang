// Daftar notifikasi nyata untuk anggota: acara mendatang, pengajian rutin, arsip baru.
// Dipakai oleh lonceng (badge) dan halaman /notifikasi.
import { getActiveEvents, getArchivedEvents } from "./queries";
import { ROUTINE, nextMalamJumatKe4, formatRoutineDate } from "./routine";
import { eventStartsAt, formatEventTime, countdownLabel } from "./event-time";
import { relativeTime } from "./time-label";

export type NotifKind = "acara" | "pengajian" | "arsip";

export interface NotifItem {
  id: string;
  kind: NotifKind;
  title: string;
  desc: string;
  /** waktu tampil (ISO atau "YYYY-MM-DD HH:MM:SS"); null bila tidak ada */
  time: string | null;
  timeLabel: string;
  image: string | null;
  href: string;
  fresh: boolean;
}

function short(text: string, max = 110): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

export async function getMemberNotifications(): Promise<NotifItem[]> {
  const [active, archived] = await Promise.all([getActiveEvents(), getArchivedEvents()]);
  const items: NotifItem[] = [];

  for (const ev of active) {
    const starts = eventStartsAt(ev);
    const timeText = formatEventTime(ev.event_time);
    items.push({
      id: `acara-${ev.id}`,
      kind: "acara",
      title: ev.title,
      desc: short(ev.description || "Kegiatan Cigatas — buka untuk melihat kebutuhan & menawarkan bantuan."),
      time: starts ? starts.toISOString() : ev.created_at,
      timeLabel: starts
        ? `${starts.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}${timeText ? ` · ${timeText}` : ""} · ${countdownLabel(starts)}`
        : `Diumumkan ${relativeTime(ev.created_at)}`,
      image: ev.cover_image || "/images/hero-mosque.webp",
      href: `/kegiatan/${ev.slug}`,
      fresh: true,
    });
  }

  const next = nextMalamJumatKe4();
  items.push({
    id: "pengajian-rutin",
    kind: "pengajian",
    title: `Pengajian Rutin — ${ROUTINE.title}`,
    desc: short(`${ROUTINE.place} · ${ROUTINE.speaker} (${ROUTINE.speakerRole})`),
    time: next.toISOString(),
    timeLabel: `${formatRoutineDate(next)} · ${ROUTINE.time} · ${countdownLabel(next)}`,
    image: ROUTINE.poster,
    href: "/informasi",
    fresh: true,
  });

  for (const ev of archived.slice(0, 3)) {
    items.push({
      id: `arsip-${ev.id}`,
      kind: "arsip",
      title: `Laporan: ${ev.title}`,
      desc: short(ev.description || "Kegiatan selesai. Lihat laporan, dokumentasi, dan sisa barang."),
      time: ev.completed_at || ev.created_at,
      timeLabel: `Selesai ${relativeTime(ev.completed_at || ev.created_at)}`,
      image: ev.cover_image || "/images/footer-leaves.webp",
      href: `/arsip/${ev.slug}`,
      fresh: false,
    });
  }

  items.sort((a, b) => {
    if (a.fresh !== b.fresh) return a.fresh ? -1 : 1;
    const ta = a.time ? new Date(a.time.includes("T") ? a.time : a.time.replace(" ", "T") + "Z").getTime() : 0;
    const tb = b.time ? new Date(b.time.includes("T") ? b.time : b.time.replace(" ", "T") + "Z").getTime() : 0;
    return ta - tb;
  });
  return items;
}

/** Jumlah badge lonceng anggota = informasi aktif (acara + pengajian). */
export async function getMemberNotifCount(): Promise<number> {
  const items = await getMemberNotifications();
  return items.filter((i) => i.fresh).length;
}
