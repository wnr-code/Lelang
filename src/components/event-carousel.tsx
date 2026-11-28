"use client";

import Link from "next/link";
import { MapPin, CalendarPlus, Clock3 } from "lucide-react";
import { EventCountdown } from "@/components/event-countdown";
import { eventStartsAt, formatEventTime } from "@/lib/event-time";
import type { EventRow } from "@/lib/types";

function dateBlock(dateStr: string | null) {
  if (!dateStr) return { day: "—", mon: "", dow: "" };
  const d = new Date(dateStr + (dateStr.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return { day: "—", mon: "", dow: "" };
  return {
    day: String(d.getDate()),
    mon: d.toLocaleDateString("id-ID", { month: "short" }),
    dow: d.toLocaleDateString("id-ID", { weekday: "short" }),
  };
}

/**
 * Daftar kegiatan berjalan otomatis dari pinggir (marquee horizontal),
 * bukan list ke bawah. Berhenti saat disentuh/hover agar mudah diklik.
 */
export function EventCarousel({ events }: { events: EventRow[] }) {
  if (events.length === 0) return null;
  // Duplikasi konten agar loop mulus; animasi digeser -50%.
  const loop = events.length > 1 ? [...events, ...events] : events;
  const duration = Math.max(18, events.length * 9);

  return (
    <div className="group relative -mx-4 overflow-hidden">
      {/* tepi memudar */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-white to-transparent" />
      <div
        className="flex w-max gap-3 px-4 py-1 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none"
        style={events.length > 1 ? { animation: `cigatasMarquee ${duration}s linear infinite` } : undefined}
      >
        {loop.map((ev, idx) => {
          const db = dateBlock(ev.event_date);
          const starts = eventStartsAt(ev);
          return (
            <Link
              key={`${ev.id}-${idx}`}
              href={`/kegiatan/${ev.slug}`}
              className="flex w-[248px] shrink-0 flex-col rounded-2xl bg-white p-3.5 ring-1 ring-emerald-900/10 shadow-[0_4px_14px_rgba(7,91,53,0.06)] transition hover:shadow-md"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex w-[54px] shrink-0 flex-col items-center rounded-xl bg-emerald-100/70 py-1.5">
                  <span className="text-[20px] font-extrabold leading-none text-emerald-900">{db.day}</span>
                  <span className="text-[11px] font-extrabold text-emerald-900">{db.mon}</span>
                  {db.dow && <span className="mt-0.5 rounded-full bg-emerald-600 px-1.5 text-[9px] font-bold text-white">{db.dow}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[14px] font-extrabold leading-tight text-ink">{ev.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-stone-500">
                    <MapPin className="h-3 w-3 shrink-0 text-emerald-600" />
                    <span className="truncate">{ev.location || "Cigatas"}</span>
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                {starts ? (
                  <EventCountdown startsAt={starts.toISOString()} compact />
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                    <Clock3 className="h-3 w-3" /> {formatEventTime(ev.event_time) || "Jadwal menyusul"}
                  </span>
                )}
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-700 px-2.5 py-1 text-[10px] font-extrabold text-white">
                  <CalendarPlus className="h-3 w-3" /> Ikut
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
