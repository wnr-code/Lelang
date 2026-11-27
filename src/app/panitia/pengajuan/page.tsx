import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { isPanitia } from "@/lib/auth";
import { getSubmissions, getAllEvents } from "@/lib/queries";
import { SubmissionCard } from "@/components/panitia-submissions";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "pending", label: "Menunggu" },
  { key: "approved", label: "Disetujui" },
  { key: "rejected", label: "Ditolak" },
];

export default async function PengajuanPage({ searchParams }: { searchParams: Promise<{ status?: string; event?: string }> }) {
  if (!(await isPanitia())) redirect("/panitia/login");
  const sp = await searchParams;
  const status = sp.status || "pending";
  const eventId = sp.event ? Number(sp.event) : undefined;
  const subs = await getSubmissions(eventId, status);
  const events = await getAllEvents();
  const pendingCount = (await getSubmissions(undefined, "pending")).length;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-ink">Pengajuan Anggota</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Persetujuan bantuan. {pendingCount > 0 ? `${pendingCount} pengajuan menunggu keputusan.` : "Tidak ada yang menunggu."}
        </p>
      </div>

      {/* Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-white p-1 ring-1 ring-stone-200">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/panitia/pengajuan?status=${f.key}${eventId ? `&event=${eventId}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${status === f.key ? "bg-emerald-600 text-white" : "text-stone-500 hover:bg-stone-50"}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`/panitia/pengajuan?status=${status}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ring-1 transition ${!eventId ? "bg-stone-800 text-white ring-stone-800" : "bg-white text-stone-500 ring-stone-200 hover:bg-stone-50"}`}
          >
            Semua kegiatan
          </Link>
          {events.map((ev) => (
            <Link
              key={ev.id}
              href={`/panitia/pengajuan?status=${status}&event=${ev.id}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ring-1 transition ${eventId === ev.id ? "bg-stone-800 text-white ring-stone-800" : "bg-white text-stone-500 ring-stone-200 hover:bg-stone-50"}`}
            >
              {ev.title}
            </Link>
          ))}
        </div>
      </div>

      {subs.length === 0 ? (
        <EmptyState icon={<Inbox className="h-10 w-10" />} title="Tidak ada pengajuan" subtitle="Pengajuan anggota akan muncul di sini untuk ditinjau." />
      ) : (
        <div className="space-y-3">
          {subs.map((s) => <SubmissionCard key={s.id} sub={s} />)}
        </div>
      )}
    </div>
  );
}
