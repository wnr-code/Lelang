import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, ArrowLeft, Clock3 } from "lucide-react";
import { PublicFooter, ProgressBar, formatDate } from "@/components/ui";
import { PublicHeader } from "@/components/public-header";
import { EventTabs } from "@/components/event-tabs";
import { EventCountdown } from "@/components/event-countdown";
import { LelangTitle } from "@/components/lelang-title";
import { PushReminder } from "@/components/push-reminder";
import { getEventBySlug, getItemsWithStatus, getEventProgress, getPanitiaWa } from "@/lib/queries";
import { ProposalForm } from "@/components/proposal-form";
import { eventStartsAt, formatEventTime } from "@/lib/event-time";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.status === "draft") notFound();

  const items = await getItemsWithStatus(event.id);
  const progress = await getEventProgress(event.id);
  const panitiaWa = await getPanitiaWa();
  const isActive = event.status === "active";
  const starts = eventStartsAt(event);
  const timeText = formatEventTime(event.event_time);

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <Link href="/" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-emerald-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke beranda
        </Link>

        <section className="card mt-3 overflow-hidden">
          <div className="banner-grad px-5 py-5 text-white">
            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-100">
              {isActive ? "Kegiatan Aktif" : "Kegiatan Selesai"}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold">{event.title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-50">
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(event.event_date)}</span>
              {timeText && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{timeText}</span>}
              {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>}
            </div>
            {isActive && starts && (
              <div className="mt-4">
                <EventCountdown startsAt={starts.toISOString()} />
              </div>
            )}
          </div>
          <div className="px-5 py-4">
            <p className="text-sm leading-relaxed text-stone-600">{event.description}</p>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-bold text-stone-500">Progres pemenuhan</span>
                <span className="font-extrabold text-emerald-700">{progress.fulfilled} dari {progress.total} item</span>
              </div>
              <ProgressBar value={progress.fulfilled} max={progress.total} />
            </div>
          </div>
        </section>

        {isActive && starts && (
          <div className="mt-4">
            <PushReminder eventId={event.id} eventTitle={event.title} eventSlug={event.slug} startsAt={starts.toISOString()} />
          </div>
        )}

        {/* Judul Lelang Kebaikan dengan grafis ketuk palu */}
        <section className="mt-7">
          <LelangTitle />
          <div className="mt-4">
            <EventTabs items={items} isActive={isActive} slug={event.slug} panitiaWa={panitiaWa} />
          </div>
        </section>

        {isActive && (
          <section className="mt-6">
            <div className="card px-5 py-4">
              <h2 className="text-[15px] font-extrabold text-ink">Tidak menemukan yang kamu cari?</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
                Usulkan barang/kebutuhan baru. Panitia akan meninjau dan menyetujui sebelum menjadi kebutuhan resmi kegiatan.
              </p>
              <div className="mt-3">
                <ProposalForm eventId={event.id} panitiaWa={panitiaWa} />
              </div>
            </div>
          </section>
        )}

        {!isActive && (
          <div className="card mt-6 px-5 py-4 text-center">
            <p className="text-sm font-bold text-stone-600">Kegiatan ini sudah selesai.</p>
            <Link href={`/arsip/${event.slug}`} className="btn-secondary mt-3">Lihat Laporan & Arsip</Link>
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
