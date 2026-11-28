import Link from "next/link";
import { redirect } from "next/navigation";
import { Recycle, ExternalLink } from "lucide-react";
import { isPanitia } from "@/lib/auth";
import { getAllEvents, getItemsWithStatus, getSurplus, getPhotos, getFulfillmentsForEvent } from "@/lib/queries";
import { SurplusSection, PhotoSection } from "@/components/panitia-surplus";
import { ExportPanel } from "@/components/panitia-export";
import { EmptyState } from "@/components/ui";
import { SURPLUS_DECISION_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LaporanPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  if (!(await isPanitia())) redirect("/panitia/login");
  const sp = await searchParams;
  const events = await getAllEvents();
  const selectedId = sp.event ? Number(sp.event) : (events.find((e) => e.status === "active")?.id ?? events[0]?.id);
  const selected = events.find((e) => e.id === selectedId);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-ink">Laporan & Sisa Barang</h1>
        <p className="mt-0.5 text-sm text-stone-500">Rekap pemenuhan, keputusan kelebihan barang, dan dokumentasi. Riwayat tidak hilang.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {events.map((ev) => (
          <Link
            key={ev.id}
            href={`/panitia/laporan?event=${ev.id}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ring-1 transition ${selectedId === ev.id ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-stone-500 ring-stone-200 hover:bg-emerald-50"}`}
          >
            {ev.title}
          </Link>
        ))}
      </div>

      {!selected ? (
        <EmptyState icon={<Recycle className="h-10 w-10" />} title="Belum ada kegiatan" subtitle="Buat kegiatan dulu di menu Kelola Kegiatan." />
      ) : (
        <LaporanView eventId={selected.id} eventSlug={selected.slug} eventTitle={selected.title} />
      )}
    </div>
  );
}

async function LaporanView({ eventId, eventSlug, eventTitle }: { eventId: number; eventSlug: string; eventTitle: string }) {
  const items = await getItemsWithStatus(eventId);
  const surplus = await getSurplus(eventId);
  const photos = await getPhotos(eventId);
  const fulfillments = await getFulfillmentsForEvent(eventId);

  const totalReceived = fulfillments.filter((f) => f.received === 1).length;
  const resolved = surplus.filter((s) => s.outcome).length;

  return (
    <div className="space-y-8">
      {/* Rekap */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-stone-400">Rekap Pemenuhan — {eventTitle}</h2>
          <a href={`/arsip/${eventSlug}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">
            <ExternalLink className="h-3.5 w-3.5" /> Pratinjau publik
          </a>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-[12px] font-extrabold uppercase tracking-wide text-stone-400">
                <th className="px-4 py-3">Barang</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Terkumpul</th>
                <th className="px-4 py-3">Penanggung Jawab</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3 font-bold text-ink">{i.name}</td>
                  <td className="px-4 py-3 text-stone-500">{i.target_label}</td>
                  <td className="px-4 py-3 text-stone-500">{i.received_label || "—"}</td>
                  <td className="px-4 py-3 text-stone-500">{i.pic_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`chip ${i.status === "fulfilled" ? "bg-emerald-100 text-emerald-800" : i.status === "process" ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"}`}>
                      {i.status === "fulfilled" ? "Terpenuhi" : i.status === "process" ? "Dalam proses" : "Dibuka"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <MiniStat label="Barang diterima" value={`${totalReceived} catatan`} />
          <MiniStat label="Sisa tercatat" value={`${surplus.length} barang`} />
          <MiniStat label="Sisa diproses" value={`${resolved}/${surplus.length}`} />
        </div>
      </section>

      <ExportPanel eventId={eventId} />

      <SurplusSection eventId={eventId} items={items} surplus={surplus} />
      <PhotoSection eventId={eventId} photos={photos} />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-sm font-extrabold text-ink">{value}</p>
      <p className="text-[12px] font-semibold text-stone-400">{label}</p>
    </div>
  );
}
