"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown } from "lucide-react";

type FilterOption = { key: string; label: string; count?: number };
type EventOption = { id: number; title: string };

/** Filter status satu baris geser + pilih kegiatan ringkas (tidak wrap berantakan di mobile). */
export function SubmissionFilters({
  filters,
  status,
  eventId,
  events,
}: {
  filters: FilterOption[];
  status: string;
  eventId?: number;
  events: EventOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(nextStatus: string, nextEvent?: number) {
    const p = new URLSearchParams();
    if (nextStatus && nextStatus !== "all") p.set("status", nextStatus);
    if (nextEvent) p.set("event", String(nextEvent));
    const qs = p.toString();
    startTransition(() => router.push(`/panitia/pengajuan${qs ? `?${qs}` : ""}`));
  }

  return (
    <div className={`mb-4 space-y-2 ${pending ? "opacity-70" : ""}`}>
      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="tablist" aria-label="Filter status pengajuan">
        {filters.map((f) => {
          const active = status === f.key;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => go(f.key, eventId)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition ${
                active ? "bg-emerald-700 text-white shadow-sm" : "bg-white text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50"
              }`}
            >
              {f.label}
              {typeof f.count === "number" && f.count > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-stone-100 text-stone-500"}`}>
                  {f.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {events.length > 1 && (
        <div className="relative">
          <select
            value={eventId ?? ""}
            onChange={(e) => go(status, e.target.value ? Number(e.target.value) : undefined)}
            className="w-full appearance-none rounded-xl bg-white py-2.5 pl-3 pr-9 text-xs font-bold text-stone-600 ring-1 ring-stone-200"
            aria-label="Pilih kegiatan"
          >
            <option value="">Semua kegiatan</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        </div>
      )}
    </div>
  );
}
