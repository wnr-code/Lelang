import Link from "next/link";
import { redirect } from "next/navigation";
import { PackageCheck } from "lucide-react";
import { isPanitia } from "@/lib/auth";
import { getAllEvents, getItemsWithStatus, getFulfillments, getEventProgress } from "@/lib/queries";
import { GoodsItemCard } from "@/components/panitia-goods";
import { EmptyState, ProgressBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BarangPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  if (!(await isPanitia())) redirect("/panitia/login");
  const sp = await searchParams;
  const events = await getAllEvents();
  const selectedId = sp.event ? Number(sp.event) : (events.find((e) => e.status === "active")?.id ?? events[0]?.id);
  const selected = events.find((e) => e.id === selectedId);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-ink">Barang & Penanggung Jawab</h1>
        <p className="mt-0.5 text-sm text-stone-500">Pemenuhan kebutuhan: catat barang diterima dan tetapkan penanggung jawab per item.</p>
      </div>

      {/* Pemilih kegiatan */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {events.map((ev) => (
          <Link
            key={ev.id}
            href={`/panitia/barang?event=${ev.id}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ring-1 transition ${selectedId === ev.id ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-stone-500 ring-stone-200 hover:bg-emerald-50"}`}
          >
            {ev.title}
          </Link>
        ))}
      </div>

      {!selected ? (
        <EmptyState icon={<PackageCheck className="h-10 w-10" />} title="Belum ada kegiatan" subtitle="Buat kegiatan dulu di menu Kelola Kegiatan." />
      ) : (
        <GoodsView eventId={selected.id} />
      )}
    </div>
  );
}

async function GoodsView({ eventId }: { eventId: number }) {
  const items = await getItemsWithStatus(eventId);
  const progress = await getEventProgress(eventId);
  const itemFuls = await Promise.all(
    items.map(async (item) => ({ item, fulfillments: await getFulfillments(item.id) }))
  );

  return (
    <div>
      <div className="card mb-4 px-5 py-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-bold text-stone-500">Progres pemenuhan kegiatan</span>
          <span className="font-extrabold text-emerald-700">{progress.fulfilled} dari {progress.total} item</span>
        </div>
        <ProgressBar value={progress.fulfilled} max={progress.total} />
      </div>
      <div className="space-y-3">
        {itemFuls.map(({ item, fulfillments }) => (
          <GoodsItemCard key={item.id} item={item} fulfillments={fulfillments} />
        ))}
        {items.length === 0 && (
          <EmptyState title="Belum ada item kebutuhan" subtitle="Tambahkan kebutuhan di menu Kelola Kegiatan." />
        )}
      </div>
    </div>
  );
}
