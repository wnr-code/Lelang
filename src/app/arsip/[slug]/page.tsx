import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, UserCheck, Recycle, Camera, PackageCheck, Heart } from "lucide-react";
import { PublicHeader, PublicFooter, formatDate, EmptyState } from "@/components/ui";
import { getEventBySlug, getItemsWithStatus, getSurplus, getPhotos } from "@/lib/queries";
import { SURPLUS_DECISION_LABEL, SURPLUS_CONDITION_LABEL } from "@/lib/types";

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
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-300">Arsip Kegiatan</p>
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

        {/* Kebutuhan & penanggung jawab */}
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-stone-400">Kebutuhan & Penanggung Jawab</h2>
          <div className="card divide-y divide-stone-100">
            {items.map((item) => (
              <div key={item.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-ink">{item.name}</p>
                    <p className="text-xs text-stone-400">
                      Target {item.target_label}
                      {item.received_label && <> · terkumpul {item.received_label}</>}
                    </p>
                  </div>
                  {item.status === "fulfilled" ? (
                    <span className="chip shrink-0 bg-emerald-100 text-emerald-800"><PackageCheck className="h-3 w-3" /> Terpenuhi</span>
                  ) : (
                    <span className="chip shrink-0 bg-stone-100 text-stone-500">Sebagian</span>
                  )}
                </div>
                {item.pic_name && (
                  <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <UserCheck className="h-3.5 w-3.5" /> {item.pic_name}
                  </p>
                )}
              </div>
            ))}
            {items.length === 0 && <div className="px-5 py-6 text-center text-xs text-stone-400">Tidak ada data kebutuhan.</div>}
          </div>
        </section>

        {/* Sisa barang */}
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-stone-400">Kelebihan Barang & Pemanfaatannya</h2>
          {surplus.length === 0 ? (
            <EmptyState icon={<Recycle className="h-8 w-8" />} title="Tidak ada sisa barang" subtitle="Semua barang tersalurkan dengan baik." />
          ) : (
            <div className="space-y-3">
              {surplus.map((s) => (
                <div key={s.id} className="card px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-ink">{s.item_name}</p>
                      <p className="text-xs text-stone-400">{s.qty_label || "Jumlah tidak dicatat"} · {SURPLUS_CONDITION_LABEL[s.condition]}</p>
                    </div>
                    <span className="chip shrink-0 bg-amber-100 text-amber-800">{SURPLUS_DECISION_LABEL[s.decision]}</span>
                  </div>
                  {s.decision_note && <p className="mt-2 text-xs leading-relaxed text-stone-500">{s.decision_note}</p>}
                  {s.outcome && (
                    <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold leading-relaxed text-emerald-800">
                      Hasil: {s.outcome}
                    </p>
                  )}
                  {s.pic_name && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-stone-500">
                      <UserCheck className="h-3.5 w-3.5" /> {s.pic_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Dokumentasi */}
        <section className="mt-6">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-stone-400">Dokumentasi Kegiatan</h2>
          {photos.length === 0 ? (
            <EmptyState icon={<Camera className="h-8 w-8" />} title="Belum ada foto" subtitle="Dokumentasi akan tampil di sini." />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p) => (
                <figure key={p.id} className="card overflow-hidden">
                  <Image src={p.file_path} alt={p.caption || "Dokumentasi kegiatan"} width={600} height={400} className="aspect-[4/3] w-full object-cover" />
                  {p.caption && <figcaption className="px-3 py-2 text-[11px] leading-snug text-stone-500">{p.caption}</figcaption>}
                </figure>
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 rounded-2xl bg-emerald-600 px-5 py-5 text-center text-white">
          <Heart className="mx-auto h-6 w-6 fill-rose-300 text-rose-300" />
          <p className="mt-2 text-sm font-extrabold">Terima kasih, orang-orang baik Cigatas!</p>
          <p className="mt-1 text-xs text-emerald-100">Kebaikan yang tercatat tidak akan hilang — ia menjadi pelajaran untuk kegiatan berikutnya.</p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
