import Link from "next/link";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { NotifBell } from "@/components/notif-bell";
import type { ItemStatus, SubmissionStatus } from "@/lib/types";
import { ITEM_STATUS_LABEL, SUBMISSION_STATUS_LABEL } from "@/lib/types";

/** Logo + nama + subjudul resmi: CIGATAS · Korwil Cigatas · Bersama dalam Kebaikan. */
export function BrandMark({ size = "md", href = "/" }: { size?: "sm" | "md"; href?: string }) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-2.5" aria-label="Lelang Kebaikan Cigatas — beranda">
      <Image
        src="/images/logo-cigatas.webp"
        alt="Logo Cigatas"
        width={1420}
        height={945}
        className={size === "sm" ? "h-9 w-auto shrink-0" : "h-11 w-auto shrink-0"}
        priority
      />
      <span className="min-w-0 leading-tight">
        <span className={`block font-extrabold tracking-tight text-emerald-800 ${size === "sm" ? "text-base" : "text-lg"}`}>
          CIGATAS
        </span>
        <span className="block truncate text-[10px] font-semibold text-ink/70">Korwil Cigatas</span>
        <span className="block truncate text-[10px] italic text-emerald-700">Bersama dalam Kebaikan</span>
      </span>
    </Link>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return <BrandMark size={compact ? "sm" : "md"} />;
}

export function PublicHeader({ notif = 0 }: { notif?: number }) {
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-900/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[70px] max-w-3xl items-center gap-1 px-4">
        <div className="min-w-0 flex-1">
          <BrandMark />
        </div>
        <NotifBell count={notif} href="/#informasi" label="Informasi kegiatan" />
        <Link
          href="/pengaturan"
          aria-label="Profil & pengaturan"
          title="Profil & pengaturan"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-200"
        >
          <UserRound className="h-5 w-5" strokeWidth={2} />
        </Link>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-10 pb-24 sm:pb-6">
      <div className="mx-auto max-w-3xl px-4">
        <nav className="mb-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold text-emerald-700">
          <Link href="/tentang" className="hover:underline">Tentang</Link>
          <Link href="/arsip" className="hover:underline">Arsip Kegiatan</Link>
          <Link href="/lacak" className="hover:underline">Lacak Bantuan</Link>
          <Link href="/panitia" className="hover:underline">Panitia</Link>
        </nav>
        <div className="relative overflow-hidden rounded-[22px] shadow-[0_8px_24px_rgba(7,91,53,0.18)]">
          <Image
            src="/images/footer-leaves.webp"
            alt=""
            width={1400}
            height={280}
            className="absolute inset-0 h-full w-full object-cover"
            aria-hidden
          />
          <div className="relative px-6 py-6 text-center">
            <p lang="ar" dir="rtl" className="text-2xl leading-relaxed text-white">اللهُ يَجْزِيكُمْ خَيْرًا</p>
            <p className="mt-1 text-[11px] italic text-emerald-50">“Semoga Allah membalas kebaikan Anda”</p>
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-stone-400">
          Lelang Kebaikan Cigatas · Korwil Cigatas<br />
          Tidak ada nominal uang di halaman publik. Bantuan berbentuk barang, sembako & tenaga.
        </p>
      </div>
    </footer>
  );
}

export function ItemStatusChip({ status }: { status: ItemStatus }) {
  const styles: Record<ItemStatus, string> = {
    fulfilled: "bg-emerald-100 text-emerald-800",
    process: "bg-amber-100 text-amber-800",
    open: "bg-sky-100 text-sky-800",
  };
  const dots: Record<ItemStatus, string> = {
    fulfilled: "bg-emerald-500",
    process: "bg-amber-500",
    open: "bg-sky-500",
  };
  return (
    <span className={`chip ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} />
      {ITEM_STATUS_LABEL[status]}
    </span>
  );
}

export function SubmissionStatusChip({ status }: { status: SubmissionStatus }) {
  const cls: Record<SubmissionStatus, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    needs_confirmation: "bg-sky-100 text-sky-800",
    rejected: "bg-rose-100 text-rose-700",
    done: "bg-emerald-600 text-white",
  };
  return <span className={`chip ${cls[status] ?? cls.pending}`}>{SUBMISSION_STATUS_LABEL[status] ?? "Menunggu konfirmasi"}</span>;
}

export function ProgressBar({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-stone-100 ${className}`}>
      <div className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      {icon && <div className="text-emerald-200">{icon}</div>}
      <p className="text-sm font-bold text-stone-600">{title}</p>
      {subtitle && <p className="max-w-xs text-xs text-stone-400">{subtitle}</p>}
    </div>
  );
}

/** Avatar vektor inisial (tanpa foto orang), warna konsisten per nama. */
export function Avatar({ name, className = "h-10 w-10 text-xs" }: { name: string; className?: string }) {
  const tones = [
    "bg-emerald-100 text-emerald-800",
    "bg-sky-100 text-sky-800",
    "bg-amber-100 text-amber-800",
    "bg-violet-100 text-violet-800",
    "bg-rose-100 text-rose-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-extrabold ${tones[hash % tones.length]} ${className}`}>
      {initials}
    </span>
  );
}

/** "2 jam yang lalu" dari teks waktu UTC "YYYY-MM-DD HH:MM:SS". */
export function relativeTime(s: string): string {
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return s;
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hour = Math.round(min / 60);
  if (hour < 24) return `${hour} jam lalu`;
  const day = Math.round(hour / 24);
  if (day < 30) return `${day} hari lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Tanggal menyusul";
  const d = new Date(dateStr + (dateStr.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
