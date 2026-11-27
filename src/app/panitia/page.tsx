import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus, Inbox, PackageCheck, Recycle, ArrowRight, Clock3 } from "lucide-react";
import { isPanitia } from "@/lib/auth";
import { getDashboardCounts, getActiveEvents, getEventProgress } from "@/lib/queries";
import { ProgressBar, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

const MENUS = [
  {
    href: "/panitia/kegiatan",
    title: "Kelola Kegiatan",
    desc: "Acara dan kebutuhan",
    icon: CalendarPlus,
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    href: "/panitia/pengajuan",
    title: "Pengajuan Anggota",
    desc: "Persetujuan bantuan",
    icon: Inbox,
    color: "bg-amber-100 text-amber-700",
  },
  {
    href: "/panitia/barang",
    title: "Barang & Penanggung Jawab",
    desc: "Pemenuhan kebutuhan",
    icon: PackageCheck,
    color: "bg-sky-100 text-sky-700",
  },
  {
    href: "/panitia/laporan",
    title: "Laporan & Sisa Barang",
    desc: "Rekap dan kelebihan",
    icon: Recycle,
    color: "bg-violet-100 text-violet-700",
  },
];

export default async function PanitiaDashboard() {
  if (!(await isPanitia())) redirect("/panitia/login");
  const counts = await getDashboardCounts();
  const active = await getActiveEvents();
  const activeProgress = await Promise.all(
    active.map(async (ev) => ({ ev, p: await getEventProgress(ev.id) }))
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-ink">Pusat Kendali Panitia</h1>
        <p className="mt-1 text-sm text-stone-500">Kelola semuanya dari satu dashboard sederhana.</p>
      </div>

      {/* Statistik ringkas */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Kegiatan aktif" value={counts.active} />
        <Stat label="Menunggu keputusan" value={counts.pending} highlight={counts.pending > 0} />
        <Stat label="Kegiatan diarsipkan" value={counts.archived} />
        <Stat label="Sisa belum diproses" value={counts.unresolvedSurplus} highlight={counts.unresolvedSurplus > 0} />
      </div>

      {/* 4 menu utama */}
      <div className="grid gap-3 sm:grid-cols-2">
        {MENUS.map((m) => (
          <Link key={m.href} href={m.href} className="card group flex items-center gap-4 px-5 py-5 transition hover:shadow-md">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${m.color}`}>
              <m.icon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-ink">{m.title}</p>
              <p className="text-xs text-stone-400">{m.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
          </Link>
        ))}
      </div>

      {/* Kegiatan aktif ringkas */}
      {active.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-stone-400">Kegiatan Aktif</h2>
          <div className="space-y-3">
            {activeProgress.map(({ ev, p }) => {
              return (
                <Link key={ev.id} href={`/panitia/barang?event=${ev.id}`} className="card block px-5 py-4 transition hover:shadow-md">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-ink">{ev.title}</p>
                      <p className="text-xs text-stone-400">{formatDate(ev.event_date)}</p>
                    </div>
                    <span className="shrink-0 text-xs font-extrabold text-emerald-700">{p.fulfilled}/{p.total} item</span>
                  </div>
                  <ProgressBar value={p.fulfilled} max={p.total} className="mt-3" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {counts.pending > 0 && (
        <Link href="/panitia/pengajuan" className="mt-6 flex items-center gap-3 rounded-2xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200 transition hover:bg-amber-100">
          <Clock3 className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm font-bold text-amber-800">
            {counts.pending} pengajuan menunggu keputusanmu.
          </p>
          <ArrowRight className="h-4 w-4 shrink-0 text-amber-600" />
        </Link>
      )}
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`card px-4 py-3.5 ${highlight ? "ring-amber-300" : ""}`}>
      <p className={`text-2xl font-extrabold ${highlight ? "text-amber-600" : "text-ink"}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-stone-400">{label}</p>
    </div>
  );
}
