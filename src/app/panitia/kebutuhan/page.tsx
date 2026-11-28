import Link from "next/link";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { isPanitia } from "@/lib/auth";
import { getAllEvents, getItemsWithStatus, getEventProgress } from "@/lib/queries";
import { EventItemsPanel } from "@/components/panitia-events";
import { EmptyState, ProgressBar, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kelola Kebutuhan" };

export default async function KebutuhanPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  if (!(await isPanitia())) redirect("/panitia/login");
  const sp = await searchParams;
  const events = await getAllEvents();
  const selectedId = sp.event ? Number(sp.event) : (events.find((e) => e.status === "active")?.id ?? events[0]?.id);
  const selected = events.find((e) => e.id === selectedId);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-ink">Kelola Kebutuhan</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Daftar barang, sembako, dan kebutuhan tenaga per kegiatan lengkap dengan target & satuan.
        </p>
      </div>

      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {events.map((ev) => (
          <Link
            key={ev.id}
            href={`/panitia/kebutuhan?event=${ev.id}`}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition ${
              selectedId === ev.id
                ? "bg-emerald-600 text-white ring-emerald-600"
                : "bg-white text-stone-500 ring-stone-200 hover:bg-emerald-50"
            }`}
          >
            {ev.title}
          </Link>
        ))}
      </div>

      {!selected ? (
        <EmptyState icon={<Package className="h-10 w-10" />} title="Belum ada kegiatan" subtitle="Buat kegiatan dulu di menu Kelola Kegiatan." />
      ) : (
        <KebutuhanView eventId={selected.id} title={selected.title} date={selected.event_date} />
      )}
    </div>
  );
}

async function KebutuhanView({ eventId, title, date }: { eventId: number; title: string; date: string | null }) {
  const items = await getItemsWithStatus(eventId);
  const progress = await getEventProgress(eventId);
  return (
    <div className="space-y-4">
      <div className="card px-5 py-4">
        <p className="text-sm font-extrabold text-ink">{title}</p>
        <p className="text-[12px] text-stone-400">{formatDate(date)}</p>
        <div className="mb-1.5 mt-3 flex items-center justify-between text-xs">
          <span className="font-bold text-stone-500">Progres pemenuhan</span>
          <span className="font-extrabold text-emerald-700">{progress.fulfilled} dari {progress.total} item</span>
        </div>
        <ProgressBar value={progress.fulfilled} max={progress.total} />
      </div>
      <EventItemsPanel eventId={eventId} items={items} />
    </div>
  );
}
