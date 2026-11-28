import Link from "next/link";
import { Bell, CalendarDays, BookOpen, Archive, ArrowRight, Clock3 } from "lucide-react";
import { PublicFooter } from "@/components/ui";
import { PublicHeader } from "@/components/public-header";
import { PushReminder } from "@/components/push-reminder";
import { getMemberNotifications, type NotifKind } from "@/lib/notifications";
import { getActiveEvents } from "@/lib/queries";
import { eventStartsAt } from "@/lib/event-time";
import { EventCountdown } from "@/components/event-countdown";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifikasi" };

const KIND_LABEL: Record<NotifKind, string> = { acara: "Acara", pengajian: "Pengajian", arsip: "Laporan" };
const KIND_ICON: Record<NotifKind, React.ComponentType<{ className?: string }>> = {
  acara: CalendarDays,
  pengajian: BookOpen,
  arsip: Archive,
};

export default async function NotifikasiPage() {
  const [items, events] = await Promise.all([getMemberNotifications(), getActiveEvents()]);
  const upcoming = events
    .map((ev) => ({ ev, starts: eventStartsAt(ev) }))
    .filter((x) => x.starts && x.starts.getTime() > Date.now())
    .sort((a, b) => a.starts!.getTime() - b.starts!.getTime());
  const next = upcoming[0];

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <div className="mt-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Bell className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-ink">Notifikasi</h1>
            <p className="text-[14px] text-stone-500">Informasi kegiatan, pengajian, dan laporan terbaru.</p>
          </div>
        </div>

        <div className="mt-4">
          <PushReminder
            eventId={next?.ev.id}
            eventTitle={next?.ev.title}
            eventSlug={next?.ev.slug}
            startsAt={next?.starts?.toISOString() ?? null}
            hideControls
          />
        </div>

        {next && (
          <section className="card mt-4 overflow-hidden">
            <div className="banner-grad px-5 py-4 text-white">
              <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-widest text-emerald-100">
                <Clock3 className="h-3.5 w-3.5" /> Acara terdekat
              </p>
              <h2 className="mt-1 text-[18px] font-extrabold">{next.ev.title}</h2>
              <div className="mt-3">
                <EventCountdown startsAt={next.starts!.toISOString()} />
              </div>
            </div>
            <div className="px-5 py-3">
              <Link href={`/kegiatan/${next.ev.slug}`} className="inline-flex items-center gap-1.5 text-[14px] font-extrabold text-emerald-700">
                Lihat kebutuhan & konfirmasi hadir <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}

        <section className="mt-6">
          <h2 className="mb-3 text-[15px] font-extrabold text-ink">Semua Informasi</h2>
          <div className="space-y-3">
            {items.map((n) => {
              const Icon = KIND_ICON[n.kind];
              return (
                <Link key={n.id} href={n.href} className="card flex gap-3 px-4 py-3.5 transition hover:shadow-md">
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-emerald-50 ring-1 ring-emerald-900/5">
                    {n.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <Icon className="absolute inset-0 m-auto h-7 w-7 text-emerald-600" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">
                      <Icon className="h-3 w-3" /> {KIND_LABEL[n.kind]}
                      {n.fresh && <span className="ml-auto rounded-full bg-gold/20 px-2 py-0.5 text-[11px] text-emerald-800">Baru</span>}
                    </span>
                    <span className="mt-0.5 block text-[15px] font-extrabold leading-snug text-ink">{n.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-stone-500">{n.desc}</span>
                    <span className="mt-1 block text-[12px] font-semibold text-emerald-700">{n.timeLabel}</span>
                  </span>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-stone-300" />
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
