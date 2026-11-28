import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, ArrowLeft, UserCheck, PackageCheck, Package, HandHeart } from "lucide-react";
import { PublicHeader, PublicFooter, ItemStatusChip, ProgressBar, formatDate, EmptyState } from "@/components/ui";
import { HelpForm } from "@/components/help-form";
import { getEventBySlug, getItemsWithStatus, getEventProgress } from "@/lib/queries";
import type { ItemWithStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.status === "draft") notFound();

  const items = await getItemsWithStatus(event.id);
  const progress = await getEventProgress(event.id);
  const isActive = event.status === "active";
  const barang = items.filter((i) => i.kind !== "tenaga");
  const tenaga = items.filter((i) => i.kind === "tenaga");

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <Link href="/" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-emerald-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke beranda
        </Link>

        <section className="card mt-3 overflow-hidden">
          <div className="banner-grad px-5 py-5 text-white">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">
              {isActive ? "Kegiatan Aktif" : "Kegiatan Selesai"}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold">{event.title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-50">
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(event.event_date)}</span>
              {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>}
            </div>
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

        {/* Infaq barang & sembako */}
        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-stone-400">
            <Package className="h-4 w-4 text-emerald-600" /> Kebutuhan Barang & Sembako
          </h2>
          {barang.length === 0 && <EmptyState title="Belum ada kebutuhan barang" subtitle="Panitia belum menambahkan daftar barang/sembako." />}
          <div className="space-y-3">
            {barang.map((item) => <ItemCard key={item.id} item={item} isActive={isActive} slug={event.slug} />)}
          </div>
        </section>

        {/* Bantuan tenaga */}
        {tenaga.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-stone-400">
              <HandHeart className="h-4 w-4 text-emerald-600" /> Bantuan Tenaga
            </h2>
            <div className="space-y-3">
              {tenaga.map((item) => <ItemCard key={item.id} item={item} isActive={isActive} slug={event.slug} />)}
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

function ItemCard({ item, isActive, slug }: { item: ItemWithStatus; isActive: boolean; slug: string }) {
  return (
    <div className="card px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold text-ink">{item.name}</h3>
          <p className="mt-0.5 text-sm font-semibold text-stone-500">
            {item.target_label}{item.unit ? ` · satuan ${item.unit}` : ""}
          </p>
          {item.note && <p className="mt-1 text-xs leading-relaxed text-stone-400">{item.note}</p>}
        </div>
        <ItemStatusChip status={item.status} />
      </div>

      {item.target_qty != null && item.received_qty > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] font-semibold text-stone-400">
            <span>Terkumpul: {item.received_label}</span>
            <span>Target: {item.target_label}</span>
          </div>
          <ProgressBar value={item.received_qty} max={item.target_qty} />
        </div>
      )}

      {item.pic_name && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800">
          <UserCheck className="h-3.5 w-3.5" /> Penanggung jawab: {item.pic_name}
        </p>
      )}

      {isActive && item.status !== "fulfilled" && (
        <div className="mt-4">
          <HelpForm item={item} eventSlug={slug} />
        </div>
      )}
      {item.status === "fulfilled" && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
          <PackageCheck className="h-4 w-4" /> Alhamdulillah, kebutuhan ini sudah terpenuhi. Terima kasih!
        </p>
      )}
    </div>
  );
}
