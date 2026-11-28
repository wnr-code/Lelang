"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, X, ArrowRight, CalendarDays, BookOpen, Archive } from "lucide-react";
import type { NotifItem, NotifKind } from "@/lib/notifications";

const KIND_LABEL: Record<NotifKind, string> = { acara: "Acara", pengajian: "Pengajian", arsip: "Laporan" };
const KIND_ICON: Record<NotifKind, React.ComponentType<{ className?: string }>> = {
  acara: CalendarDays,
  pengajian: BookOpen,
  arsip: Archive,
};

/**
 * Lonceng notifikasi dengan badge angka nyata.
 * - Bila `items` diisi (anggota): klik membuka daftar judul + deskripsi + waktu + thumbnail.
 * - Bila hanya `href` (panitia): klik langsung menuju halaman notifikasi.
 */
export function NotifBell({
  count = 0,
  items = [],
  href,
  label = "Notifikasi",
}: {
  count?: number;
  items?: NotifItem[];
  href?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem("cigatas.notif_seen");
      if (v) setSeenAt(Number(v));
    } catch {}
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const unseen = seenAt
    ? items.filter((i) => i.fresh && (!i.time || new Date(i.time).getTime() > seenAt)).length
    : items.filter((i) => i.fresh).length;
  const badge = Math.max(count, items.length > 0 ? unseen : 0);
  const dropdown = items.length > 0;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = Date.now();
      setSeenAt(now);
      try { localStorage.setItem("cigatas.notif_seen", String(now)); } catch {}
    }
  }

  const button = (
    <button
      onClick={dropdown ? toggle : undefined}
      aria-label={`${label}${badge > 0 ? ` (${badge} baru)` : ""}`}
      aria-expanded={dropdown ? open : undefined}
      className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-800 shadow-[0_2px_10px_rgba(7,91,53,0.10)] ring-1 ring-emerald-900/10 transition hover:bg-emerald-50 active:scale-95"
    >
      <Bell className="h-5 w-5" strokeWidth={2.3} />
      {badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[11px] font-extrabold text-emerald-900 ring-2 ring-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );

  if (!dropdown) {
    return href ? <Link href={href} aria-label={label}>{button}</Link> : button;
  }

  return (
    <div ref={ref} className="relative">
      {button}
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-3xl bg-white shadow-[0_16px_48px_rgba(7,91,53,0.22)] ring-1 ring-emerald-900/10">
          <div className="flex items-center justify-between bg-gradient-to-r from-emerald-700 to-emerald-800 px-4 py-3 text-white">
            <p className="text-[15px] font-extrabold">
              Notifikasi <span className="ml-1 rounded-full bg-gold px-1.5 py-0.5 text-[12px] text-emerald-900">{items.length}</span>
            </p>
            <button onClick={() => setOpen(false)} aria-label="Tutup notifikasi" className="rounded-full p-1 hover:bg-white/15">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[62vh] overflow-y-auto">
            {items.map((n) => {
              const Icon = KIND_ICON[n.kind];
              return (
                <Link key={n.id} href={n.href} onClick={() => setOpen(false)} className="flex gap-3 border-b border-stone-100 px-3.5 py-3 transition hover:bg-emerald-50/60">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-emerald-50 ring-1 ring-emerald-900/5">
                    {n.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <Icon className="absolute inset-0 m-auto h-6 w-6 text-emerald-600" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">
                      <Icon className="h-3 w-3" /> {KIND_LABEL[n.kind]}
                      {n.fresh && <span className="ml-auto h-2 w-2 rounded-full bg-gold" />}
                    </span>
                    <span className="mt-0.5 block text-[15px] font-extrabold leading-snug text-stone-800">{n.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-stone-500 line-clamp-2">{n.desc}</span>
                    <span className="mt-1 block text-[12px] font-semibold text-emerald-700">{n.timeLabel}</span>
                  </span>
                </Link>
              );
            })}
          </div>
          <Link href={href ?? "/notifikasi"} onClick={() => setOpen(false)} className="flex items-center justify-center gap-1.5 bg-emerald-50 px-4 py-3 text-[14px] font-extrabold text-emerald-800 hover:bg-emerald-100">
            Lihat semua & atur pengingat <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
