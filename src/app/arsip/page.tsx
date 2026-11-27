import Link from "next/link";
import { Archive, ArrowLeft, CalendarDays, PackageCheck, Recycle, Camera } from "lucide-react";
import { PublicHeader, PublicFooter, formatDate, EmptyState } from "@/components/ui";
import { getArchivedEvents, getItemsWithStatus, getSurplus, getPhotos } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const events = await getArchivedEvents();
  const eventData = await Promise.all(
    events.map(async (ev) => ({
      ev,
      items: await getItemsWithStatus(ev.id),
      surplus: await getSurplus(ev.id),
      photos: await getPhotos(ev.id),
    }))
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <Link href="/" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-emerald-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke papan
        </Link>
        <section className="mt-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Archive className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-extrabold text-ink">Arsip Kegiatan Cigatas</h1>
              <p className="text-xs text-stone-400">Rekam jejak kebaikan — agar kegiatan berikutnya belajar dari yang sebelumnya.</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {events.length === 0 && (
              <EmptyState icon={<Archive className="h-10 w-10" />} title="Belum ada arsip" subtitle="Kegiatan yang selesai akan otomatis masuk ke arsip." />
            )}
            {eventData.map(({ ev, items, surplus, photos }) => {
              const fulfilled = items.filter((i) => i.status === "fulfilled").length;
              return (
                <Link key={ev.id} href={`/arsip/${ev.slug}`} className="card block px-5 py-4 transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-extrabold text-ink">{ev.title}</h2>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-stone-400">
                        <CalendarDays className="h-3.5 w-3.5" /> {formatDate(ev.event_date)}
                      </p>
                    </div>
                    <span className="chip shrink-0 bg-stone-100 text-stone-600">Selesai</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-500">{ev.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-stone-500">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700">
                      <PackageCheck className="h-3.5 w-3.5" /> {fulfilled}/{items.length} terpenuhi
                    </span>
                    {surplus.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-amber-700">
                        <Recycle className="h-3.5 w-3.5" /> {surplus.length} sisa barang
                      </span>
                    )}
                    {photos.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-sky-700">
                        <Camera className="h-3.5 w-3.5" /> {photos.length} foto
                      </span>
                    )}
                  </div>
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
