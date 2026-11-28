import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { isPanitia } from "@/lib/auth";
import { getSubmissions, getAllEvents } from "@/lib/queries";
import { SubmissionCard } from "@/components/panitia-submissions";
import { SubmissionFilters } from "@/components/submission-filters";
import { EmptyState } from "@/components/ui";
import type { SubmissionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "pending", label: "Menunggu" },
  { key: "needs_confirmation", label: "Konfirmasi" },
  { key: "approved", label: "Disetujui" },
  { key: "done", label: "Diterima" },
  { key: "rejected", label: "Ditolak" },
];
const VALID = new Set(["all", "pending", "needs_confirmation", "approved", "done", "rejected"]);

export default async function PengajuanPage({ searchParams }: { searchParams: Promise<{ status?: string; event?: string }> }) {
  if (!(await isPanitia())) redirect("/panitia/login");
  const sp = await searchParams;
  // Default "Semua": kartu tetap terlihat setelah status berubah (tidak pindah tab / tidak hilang).
  const status = sp.status && VALID.has(sp.status) ? sp.status : "all";
  const eventId = sp.event ? Number(sp.event) : undefined;
  const subs = await getSubmissions(eventId, status);
  const events = await getAllEvents();
  const scoped = eventId ? await getSubmissions(eventId, "all") : subs;
  const counts = scoped.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});
  const filters = FILTERS.map((f) => ({ ...f, count: f.key === "all" ? scoped.length : counts[f.key] ?? 0 }));
  const pendingCount = counts.pending ?? 0;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-ink">Kelola Pengajuan</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          {pendingCount > 0 ? `${pendingCount} menunggu konfirmasi.` : "Tidak ada yang menunggu."}{" "}
          Satu tombol memajukan status — kartu tetap di sini.
        </p>
        <p className="mt-1 text-[12px] text-stone-400">
          Disetujui ≠ diterima fisik. Jumlah diterima hanya bertambah saat ditandai diterima.
        </p>
      </div>

      <SubmissionFilters filters={filters} status={status} eventId={eventId} events={events.map((e) => ({ id: e.id, title: e.title }))} />

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
