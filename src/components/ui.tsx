import Link from "next/link";
import { Heart, HandHeart, Archive, ShieldCheck } from "lucide-react";
import type { ItemStatus, SubmissionStatus } from "@/lib/types";
import { ITEM_STATUS_LABEL } from "@/lib/types";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
        <HandHeart className="h-5 w-5" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-sm font-extrabold tracking-tight text-ink">CIGATAS</span>
          <span className="block text-[10px] font-semibold uppercase tracking-widest text-emerald-700">Lelang Kebaikan</span>
        </span>
      )}
    </Link>
  );
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-900/5 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-1">
          <Link href="/arsip" className="btn-ghost">
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">Arsip</span>
          </Link>
          <Link href="/panitia" className="btn-ghost text-stone-500">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Panitia</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-16 border-t border-stone-900/5 bg-white/60">
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-emerald-700">
          <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
          Satu Kepedulian, Banyak Kebaikan
        </p>
        <p className="mt-2 text-xs text-stone-500">
          Lelang Kebaikan Cigatas · Papan gotong royong digital komunitas
        </p>
        <p className="mt-1 text-xs text-stone-400">Tidak ada nominal uang. Semua bantuan berbentuk barang & kesediaan.</p>
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
  const map: Record<SubmissionStatus, { label: string; cls: string }> = {
    pending: { label: "Menunggu keputusan", cls: "bg-amber-100 text-amber-800" },
    approved: { label: "Disetujui", cls: "bg-emerald-100 text-emerald-800" },
    rejected: { label: "Ditolak", cls: "bg-rose-100 text-rose-700" },
  };
  return <span className={`chip ${map[status].cls}`}>{map[status].label}</span>;
}

export function ProgressBar({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-stone-100 ${className}`}>
      <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      {icon && <div className="text-stone-300">{icon}</div>}
      <p className="text-sm font-bold text-stone-600">{title}</p>
      {subtitle && <p className="max-w-xs text-xs text-stone-400">{subtitle}</p>}
    </div>
  );
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Tanggal menyusul";
  const d = new Date(dateStr + (dateStr.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
