import Link from "next/link";
import type { ComponentType } from "react";
import { redirect } from "next/navigation";
import {
  CalendarPlus, Inbox, PackageCheck, Recycle, ArrowRight, Clock3, Users,
  CheckCircle2, ShieldCheck, LayoutGrid,
} from "lucide-react";
import { isPanitia } from "@/lib/auth";
import { getDashboardCounts, getActiveEvents, getEventProgress, getSubmissions } from "@/lib/queries";
import { ProgressBar, formatDate, SubmissionStatusChip } from "@/components/ui";

export const dynamic = "force-dynamic";

const MENUS = [
  { href: "/panitia/kegiatan", title: "Kelola Kegiatan", desc: "Tambah & atur kegiatan / kebutuhan", icon: CalendarPlus, tile: "bg-emerald-50", ic: "bg-emerald-600" },
  { href: "/panitia/pengajuan", title: "Kelola Pengajuan", desc: "Periksa & setujui pengajuan anggota", icon: Inbox, tile: "bg-sky-50", ic: "bg-sky-600" },
  { href: "/panitia/barang", title: "Kelola Barang", desc: "Stok, penyaluran & penanggung jawab", icon: PackageCheck, tile: "bg-amber-50", ic: "bg-amber-500" },
  { href: "/panitia/laporan", title: "Laporan", desc: "Laporan kegiatan, hasil & sisa barang", icon: Recycle, tile: "bg-violet-50", ic: "bg-violet-600" },
];

export default async function PanitiaDashboard() {
  if (!(await isPanitia())) redirect("/panitia/login");
  const counts = await getDashboardCounts();
  const active = await getActiveEvents();
  const activeProgress = await Promise.all(active.map(async (ev) => ({ ev, p: await getEventProgress(ev.id) })));
  const fulfilled = activeProgress.reduce((a, { p }) => a + p.fulfilled, 0);
  const recent = (await getSubmissions(undefined, "all")).slice(0, 3);

  return (
    <div>
      {/* Banner */}
      <div className="banner-grad relative mb-6 overflow-hidden rounded-3xl px-5 py-6 text-white shadow-md shadow-emerald-700/20">
        <span className="chip bg-white/20 text-white"><LayoutGrid className="h-3 w-3" /> Dashboard</span>
        <h1 className="mt-3 text-2xl font-extrabold leading-snug">
          Karena Berbagi adalah <span className="text-amber-300">Ibadah</span><br />dalam <span className="text-amber-300">Ridha Allah</span>
        </h1>
        <p className="mt-2 text-sm text-emerald-50/90">Pantau, kelola, dan wujudkan kegiatan terbaik bersama Cigatas.</p>
      </div>

      {/* Statistik */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Users} label="Kegiatan Aktif" value={counts.active} tone="bg-sky-100 text-sky-700" />
        <Stat icon={Inbox} label="Menunggu" value={counts.pending} tone="bg-amber-100 text-amber-700" />
        <Stat icon={CheckCircle2} label="Item Terpenuhi" value={fulfilled} tone="bg-emerald-100 text-emerald-700" />
        <Stat icon={Recycle} label="Sisa Barang" value={counts.unresolvedSurplus} tone="bg-violet-100 text-violet-700" />
      </div>

      {/* Menu utama terpisah */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-ink"><LayoutGrid className="h-4 w-4 text-emerald-600" /> Menu Utama</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {MENUS.map((m) => (
          <Link key={m.href} href={m.href} className={`group flex items-center gap-4 rounded-3xl ${m.tile} px-5 py-5 ring-1 ring-stone-900/5 transition hover:shadow-md`}>
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${m.ic} text-white shadow`}>
              <m.icon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-ink">{m.title}</p>
              <p className="text-xs text-stone-500">{m.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>

      {/* Aktivitas terbaru */}
      {recent.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-ink"><Clock3 className="h-4 w-4 text-emerald-600" /> Aktivitas Terbaru</h2>
            <Link href="/panitia/pengajuan" className="text-xs font-bold text-emerald-700 hover:underline">Lihat semua →</Link>
          </div>
          <div className="card divide-y divide-stone-100 px-5">
            {recent.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{s.nickname} · {s.item_name}</p>
                  <p className="text-xs text-stone-400">{s.event_title}</p>
                </div>
                <SubmissionStatusChip status={s.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Kegiatan aktif */}
      {activeProgress.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-stone-400">Kegiatan Aktif</h2>
          <div className="space-y-3">
            {activeProgress.map(({ ev, p }) => (
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
            ))}
          </div>
        </section>
      )}

      {/* Trust banner */}
      <div className="banner-grad mt-8 flex items-center gap-3 rounded-3xl px-5 py-4 text-white">
        <ShieldCheck className="h-8 w-8 shrink-0 text-amber-300" />
        <div>
          <p className="text-sm font-extrabold">Transparansi & Amanah</p>
          <p className="text-xs text-emerald-50/90">Bersama dalam kebaikan, hanya kepada Allah.</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: ComponentType<{ className?: string }>; label: string; value: number; tone: string }) {
  return (
    <div className="card flex flex-col items-center gap-1 px-3 py-4 text-center">
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tone}`}><Icon className="h-5 w-5" /></span>
      <p className="mt-1 text-[11px] font-semibold text-stone-500">{label}</p>
      <p className="text-2xl font-extrabold text-ink">{value}</p>
    </div>
  );
}
