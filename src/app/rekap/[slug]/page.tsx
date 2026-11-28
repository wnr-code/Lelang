import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Clock3, ArrowRight, ClipboardList } from "lucide-react";
import { PublicFooter, formatDate } from "@/components/ui";
import { PublicHeader } from "@/components/public-header";
import { EventRecapBody } from "@/components/event-recap";
import { getEventBySlug, getItemsWithStatus, getSurplus, getPhotos } from "@/lib/queries";
import { formatEventTime } from "@/lib/event-time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rekap Pemenuhan" };

/**
 * Rekap pemenuhan publik — berlaku untuk kegiatan aktif maupun yang sudah selesai/diarsipkan.
 * Inilah target tombol "Pratinjau publik" di panel laporan panitia (sebelumnya /arsip yang 404
 * untuk kegiatan aktif). Hanya data publik, tanpa nomor WA anggota maupun nominal uang.
 */
export default async function RekapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.status === "draft") notFound();

  const items = await getItemsWithStatus(event.id);
  const surplus = await getSurplus(event.id);
  const photos = await getPhotos(event.id);

  const fulfilled = items.filter((i) => i.status === "fulfilled").length;
  const statusLabel = event.status === "active" ? "Kegiatan Aktif" : event.status === "completed" ? "Selesai" : "Arsip";

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <Link href="/" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-emerald-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Beranda
        </Link>

        <section className="card mt-3 overflow-hidden">
          <div className="banner-grad px-5 py-5 text-white">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-100">
              <ClipboardList className="h-3.5 w-3.5" /> Rekap Pemenuhan · {statusLabel}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold">{event.title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-50">
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(event.event_date)}</span>
              {event.event_time && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatEventTime(event.event_time)}</span>}
              {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>}
            </div>
            <p className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[12px] font-bold">
              {fulfilled} dari {items.length} kebutuhan terpenuhi
            </p>
          </div>
          {event.description && (
            <div className="px-5 py-4">
              <p className="text-sm leading-relaxed text-stone-600">{event.description}</p>
            </div>
          )}
        </section>

        {event.status === "active" && (
          <Link href={`/kegiatan/${event.slug}`} className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-extrabold text-emerald-700 hover:underline">
            Lihat kebutuhan & ikut berinfaq <ArrowRight className="h-4 w-4" />
          </Link>
        )}

        <EventRecapBody items={items} surplus={surplus} photos={photos} />
      </main>
      <PublicFooter />
    </div>
  );
}
