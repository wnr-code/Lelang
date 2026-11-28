import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { PublicFooter, formatDate } from "@/components/ui";
import { PublicHeader } from "@/components/public-header";
import { EventRecapBody } from "@/components/event-recap";
import { getEventBySlug, getItemsWithStatus, getSurplus, getPhotos } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ArchiveDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || (event.status !== "completed" && event.status !== "archived")) notFound();

  const items = await getItemsWithStatus(event.id);
  const surplus = await getSurplus(event.id);
  const photos = await getPhotos(event.id);

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <Link href="/arsip" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-emerald-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Semua arsip
        </Link>

        <section className="card mt-3 overflow-hidden">
          <div className="bg-stone-800 px-5 py-5 text-white">
            <p className="text-[11px] font-bold uppercase tracking-widest text-stone-300">Arsip Kegiatan</p>
            <h1 className="mt-1 text-2xl font-extrabold">{event.title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-300">
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(event.event_date)}</span>
              {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>}
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm leading-relaxed text-stone-600">{event.description}</p>
          </div>
        </section>

        <EventRecapBody items={items} surplus={surplus} photos={photos} />
      </main>
      <PublicFooter />
    </div>
  );
}
