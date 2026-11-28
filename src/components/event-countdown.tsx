"use client";

import { useEffect, useState } from "react";
import { Clock3, BellRing } from "lucide-react";
import { countdownParts, pad2, REMINDER_HOURS } from "@/lib/event-time";

/** Hitung waktu berjalan menuju acara (WIB). Berdetak tiap detik di perangkat. */
export function EventCountdown({
  startsAt,
  compact = false,
}: {
  startsAt: string | null;
  compact?: boolean;
}) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!startsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startsAt]);

  if (!startsAt) return null;
  const target = new Date(startsAt);
  if (Number.isNaN(target.getTime())) return null;
  const c = countdownParts(target, new Date(now));

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-bold text-emerald-700">
        <Clock3 className="h-3.5 w-3.5" />
        {c.past ? "Sudah dimulai" : c.days > 0 ? `${c.days} hari ${pad2(c.hours)} jam lagi` : `${pad2(c.hours)}:${pad2(c.minutes)}:${pad2(c.seconds)} lagi`}
      </span>
    );
  }

  return (
    <div className="rounded-2xl bg-white/15 px-3.5 py-3 ring-1 ring-white/25">
      <p className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-50">
        <Clock3 className="h-3.5 w-3.5" />
        {c.past ? "Acara sudah dimulai" : "Menuju acara dimulai"}
      </p>
      {c.past ? (
        <p className="mt-1 text-[15px] font-extrabold text-white">Alhamdulillah, acara sedang/sudah berlangsung.</p>
      ) : (
        <div className="mt-2 flex items-end gap-1.5">
          <Unit value={String(c.days)} label="hari" />
          <Sep />
          <Unit value={pad2(c.hours)} label="jam" />
          <Sep />
          <Unit value={pad2(c.minutes)} label="menit" />
          <Sep />
          <Unit value={pad2(c.seconds)} label="detik" />
        </div>
      )}
      <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-emerald-50/90">
        <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
        Pengingat otomatis dikirim {REMINDER_HOURS} jam sebelum acara, lengkap dengan tombol Hadir / Tidak.
      </p>
    </div>
  );
}

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex min-w-[46px] flex-col items-center rounded-xl bg-white/90 px-2 py-1.5">
      <span className="text-[19px] font-extrabold leading-none text-emerald-800 tabular-nums">{value}</span>
      <span className="mt-0.5 text-[11px] font-bold uppercase text-emerald-700/70">{label}</span>
    </span>
  );
}

function Sep() {
  return <span className="pb-3 text-[15px] font-extrabold text-white/70">:</span>;
}
