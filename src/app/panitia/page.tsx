import Link from "next/link";
import type { ComponentType } from "react";
import { redirect } from "next/navigation";
import {
  Users, CalendarDays, Package, Inbox, ChevronRight, MapPin, TrendingUp, BarChart3,
  HandHeart, LayoutGrid, CalendarPlus, Gift, ClipboardList, Recycle,
} from "lucide-react";
import { isPanitia } from "@/lib/auth";
import { getDashboardCounts, getActiveEvents, getSubmissions } from "@/lib/queries";
import { Avatar, SubmissionStatusChip, relativeTime } from "@/components/ui";

export const dynamic = "force-dynamic";

const MENUS = [
  { href: "/panitia/kegiatan", title: "Kelola Kegiatan", desc: "Buat & atur kegiatan", icon: CalendarPlus, tile: "bg-emerald-50", ic: "bg-emerald-600" },
  { href: "/panitia/pengajuan", title: "Kelola Pengajuan", desc: "Verifikasi bantuan anggota", icon: ClipboardList, tile: "bg-sky-50", ic: "bg-sky-600" },
  { href: "/panitia/kebutuhan", title: "Kelola Kebutuhan", desc: "Daftar barang & tenaga", icon: Package, tile: "bg-amber-50", ic: "bg-amber-500" },
  { href: "/panitia/barang", title: "Kelola Barang", desc: "Penerimaan & penanggung jawab", icon: Gift, tile: "bg-violet-50", ic: "bg-violet-600" },
  { href: "/panitia/laporan", title: "Laporan & Sisa", desc: "Hasil kegiatan & sisa barang", icon: Recycle, tile: "bg-emerald-50", ic: "bg-emerald-700" },
  { href: "/panitia/pengaturan", title: "Pengaturan", desc: "Sistem, kontak & ekspor", icon: LayoutGrid, tile: "bg-stone-50", ic: "bg-stone-600" },
];

function dateBlock(dateStr: string | null) {
  if (!dateStr) return { day: "—", mon: "", year: "" };
  const d = new Date(dateStr + (dateStr.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return { day: "—", mon: "", year: "" };
  return {
    day: String(d.getDate()),
    mon: d.toLocaleDateString("id-ID", { month: "short" }),
    year: String(d.getFullYear()),
  };
}

export default async function PanitiaDashboard() {
  if (!(await isPanitia())) redirect("/panitia/login");
  const counts = await getDashboardCounts();
  const active = await getActiveEvents();
  const recent = (await getSubmissions(undefined, "all")).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="banner-grad animate-fade-up relative overflow-hidden rounded-[22px] px-5 py-5 text-white shadow-md shadow-emerald-800/20">
        <div className="relative z-10 max-w-[75%]">
          <h1 className="text-[22px] font-extrabold leading-tight">Dashboard Panitia</h1>
          <p className="mt-1.5 text-[12px] leading-relaxed text-emerald-50/90">
            Pantau, kelola, dan wujudkan kegiatan terbaik bersama Cigatas.
          </p>
        </div>
        <div className="pointer-events-none absolute right-4 top-4 flex items-end gap-1 opacity-90">
          <BarChart3 className="h-12 w-12 text-emerald-300/70" strokeWidth={2.2} />
          <TrendingUp className="h-10 w-10 text-gold" strokeWidth={2.4} />
        </div>
        <span className="pointer-events-none absolute -bottom-8 -right-6 h-24 w-24 rounded-full bg-emerald-400/20" />
      </div>

      {/* Statistik nyata */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat icon={Users} label="Total Anggota" value={counts.members} caption="pengaju unik" tile="bg-sky-50" ic="text-emerald-600" />
        <Stat icon={CalendarDays} label="Kegiatan Aktif" value={counts.active} caption="sedang berjalan" tile="bg-emerald-50" ic="text-emerald-700" />
        <Stat icon={Package} label="Kebutuhan" value={counts.items} caption="item tercatat" tile="bg-amber-50" ic="text-amber-500" />
        <Stat icon={Inbox} label="Menunggu" value={counts.pending} caption="perlu verifikasi" tile="bg-violet-50" ic="text-violet-500" />
      </div>

      {/* Menu utama terpisah */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-ink">
          <LayoutGrid className="h-4 w-4 text-emerald-700" /> Menu Utama
        </h2>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {MENUS.map((m) => (
            <Link key={m.href} href={m.href} className={`group flex items-center gap-3 rounded-[20px] ${m.tile} px-4 py-4 ring-1 ring-emerald-900/5 transition hover:shadow-md`}>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${m.ic} text-white shadow`}>
                <m.icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-extrabold text-ink">{m.title}</p>
                <p className="truncate text-[11px] text-stone-500">{m.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>

      {/* Jadwal kegiatan */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold text-ink">Jadwal Kegiatan</h2>
          <Link href="/panitia/kegiatan" className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-700">
            Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {active.length === 0 ? (
          <div className="card px-5 py-6 text-center text-sm text-stone-500">
            Belum ada kegiatan aktif. Buat kegiatan di menu Kelola Kegiatan.
          </div>
        ) : (
          <div className="space-y-2.5">
            {active.map((ev) => {
              const db = dateBlock(ev.event_date);
              return (
                <Link key={ev.id} href={`/panitia/barang?event=${ev.id}`} className="card flex items-center gap-3 px-4 py-3.5 transition hover:shadow-md">
                  <div className="flex w-[62px] shrink-0 flex-col items-center rounded-2xl bg-emerald-100/70 py-2">
                    <span className="text-[20px] font-extrabold leading-none text-emerald-900">{db.day}</span>
                    <span className="text-[12px] font-extrabold text-emerald-900">{db.mon}</span>
                    <span className="text-[10px] font-semibold text-ink/60">{db.year}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[14px] font-extrabold text-ink">{ev.title}</p>
                      <span className="chip shrink-0 bg-emerald-100 text-emerald-800">Aktif</span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-stone-500">
                      <MapPin className="h-3 w-3 shrink-0 text-emerald-600" />
                      <span className="truncate">{ev.location || "Cigatas"}</span>
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-stone-400">{ev.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Pengajuan terbaru */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold text-ink">Pengajuan Terbaru</h2>
          <Link href="/panitia/pengajuan" className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-700">
            Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="card px-5 py-6 text-center text-sm text-stone-500">Belum ada pengajuan masuk.</div>
        ) : (
          <div className="card divide-y divide-stone-100 px-4">
            {recent.map((s) => (
              <Link key={s.id} href="/panitia/pengajuan" className="flex items-center gap-3 py-3 transition hover:opacity-80">
                <Avatar name={s.nickname} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-extrabold text-ink">{s.nickname}</p>
                  <p className="truncate text-[11px] text-stone-500">
                    Permohonan {s.item_name.toLowerCase()} {s.qty_label ? `· ${s.qty_label}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <SubmissionStatusChip status={s.status} />
                  <span className="text-[10px] text-stone-400">{relativeTime(s.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Banner penutup */}
      <Link
        href="/panitia/laporan"
        className="banner-grad flex items-center gap-4 rounded-full px-5 py-4 text-white shadow-md shadow-emerald-800/20 transition hover:opacity-95"
      >
        <HandHeart className="h-9 w-9 shrink-0 text-gold" strokeWidth={1.9} />
        <p className="flex-1 text-[13px] font-extrabold leading-snug">
          Sedekah Hari Ini,<br />Untuk Kebaikan Esok Nanti
        </p>
        <ChevronRight className="h-5 w-5 shrink-0 text-white/80" />
      </Link>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, caption, tile, ic,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string; value: number; caption: string; tile: string; ic: string;
}) {
  return (
    <div className={`rounded-[20px] ${tile} px-4 py-4 text-center ring-1 ring-emerald-900/5`}>
      <Icon className={`mx-auto h-8 w-8 ${ic}`} strokeWidth={2} />
      <p className="mt-2 text-[12px] font-bold text-ink/80">{label}</p>
      <p className="text-[26px] font-extrabold leading-tight text-ink">{value.toLocaleString("id-ID")}</p>
      <p className="text-[10px] font-semibold text-emerald-700">{caption}</p>
    </div>
  );
}
