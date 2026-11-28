import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Settings, Database, HardDrive, ShieldCheck, Moon, Download, Info, LogOut, ExternalLink, CheckCircle2,
} from "lucide-react";
import { isPanitia } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isWorkerd } from "@/lib/storage";
import { getDashboardCounts } from "@/lib/queries";
import { ROUTINE, nextMalamJumatKe4, formatRoutineDate } from "@/lib/routine";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pengaturan Panitia" };

export default async function PanitiaPengaturanPage() {
  if (!(await isPanitia())) redirect("/panitia/login");
  const worker = isWorkerd();
  const supabase = isSupabaseConfigured();
  const counts = await getDashboardCounts();
  const nextRoutine = nextMalamJumatKe4();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <Settings className="h-6 w-6" strokeWidth={1.9} />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-ink">Pengaturan</h1>
          <p className="text-xs text-stone-500">Status sistem, aturan main, dan data kegiatan.</p>
        </div>
      </div>

      {/* Status sistem */}
      <section className="card px-5 py-5">
        <h2 className="mb-3 text-sm font-extrabold text-ink">Status Sistem</h2>
        <div className="space-y-2.5">
          <Row icon={Database} label="Database" value={supabase ? "Supabase (terpusat)" : "SQLite (preview lokal)"} ok={supabase || !worker} />
          <Row icon={HardDrive} label="Penyimpanan foto" value={worker ? "Cloudflare R2 · bucket liqo" : "Filesystem data/uploads (preview)"} ok />
          <Row icon={ShieldCheck} label="Sesi panitia" value="Login kata sandi + cookie bertanda tangan" ok />
          <Row icon={CheckCircle2} label="Data tercatat" value={`${counts.members} anggota · ${counts.items} kebutuhan · ${counts.archived} arsip`} ok />
        </div>
        <a href="/api/health" target="_blank" className="btn-secondary mt-4 w-full py-2 text-xs">
          <ExternalLink className="h-3.5 w-3.5" /> Buka pemeriksaan sistem (/api/health)
        </a>
      </section>

      {/* Aturan aplikasi */}
      <section className="card px-5 py-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-ink">
          <Info className="h-4 w-4 text-emerald-700" /> Aturan yang Berlaku
        </h2>
        <ul className="space-y-1.5 text-[12px] leading-relaxed text-stone-600">
          <li>• Nomor WhatsApp pengaju <b>wajib</b> dan <b>hanya terlihat panitia</b>.</li>
          <li>• Pengajuan anggota <b>belum</b> dianggap diterima sampai panitia memverifikasi di menu Kelola Barang.</li>
          <li>• Status pengajuan: Menunggu konfirmasi → Disetujui / Perlu konfirmasi / Ditolak → Selesai.</li>
          <li>• Sisa barang: Disimpan, Digunakan untuk kegiatan berikutnya, Ditukar, Dijual kembali, Disalurkan.</li>
          <li>• Foto dokumentasi maksimal <b>2 MB</b>, dikompres otomatis ke WebP.</li>
          <li>• Tidak ada nominal uang yang ditampilkan ke publik.</li>
          <li>• Sisa barang dicatat permanen dan tidak hilang dari riwayat.</li>
        </ul>
      </section>

      {/* Pengajian rutin */}
      <section className="card px-5 py-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-ink">
          <Moon className="h-4 w-4 text-emerald-700" /> Pengajian Rutin
        </h2>
        <p className="text-[12px] leading-relaxed text-stone-600">
          {ROUTINE.title} · {ROUTINE.freq}<br />
          Berikutnya: <b>{formatRoutineDate(nextRoutine)}</b> · {ROUTINE.time}<br />
          {ROUTINE.place}<br />
          {ROUTINE.speaker} — {ROUTINE.speakerRole}
        </p>
        <Link href="/informasi" className="btn-ghost mt-2 px-0 text-xs text-emerald-700">
          Lihat halaman informasi publik →
        </Link>
      </section>

      {/* Data & ekspor */}
      <section className="card px-5 py-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-ink">
          <Download className="h-4 w-4 text-emerald-700" /> Data & Ekspor
        </h2>
        <p className="text-[12px] text-stone-600">
          Ekspor laporan kegiatan ke PDF atau Excel tersedia di menu Laporan & Sisa (pilih kegiatan, lalu unduh).
        </p>
        <Link href="/panitia/laporan" className="btn-primary mt-3 w-full py-2 text-xs">
          <Download className="h-3.5 w-3.5" /> Buka Laporan & Ekspor
        </Link>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-sm font-extrabold text-ink">Keluar dari panitia</p>
          <p className="text-[11px] text-stone-400">Sesi ditutup di perangkat ini.</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn-danger px-4 py-2 text-xs">
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </form>
      </section>
    </div>
  );
}

function Row({
  icon: Icon, label, value, ok,
}: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; ok: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-stone-50 px-3.5 py-2.5">
      <Icon className={`h-4 w-4 shrink-0 ${ok ? "text-emerald-600" : "text-amber-500"}`} />
      <span className="w-[120px] shrink-0 text-[11px] font-bold uppercase tracking-wide text-stone-500">{label}</span>
      <span className="min-w-0 flex-1 text-[12px] font-semibold text-ink">{value}</span>
    </div>
  );
}
