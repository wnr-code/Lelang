import { History } from "lucide-react";
import type { StatusLogRow } from "@/lib/types";

function fmt(s: string): string {
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T") + (s.includes("T") ? "" : "Z"));
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) + ", " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

const ACTOR_LABEL: Record<string, string> = { anggota: "Anggota", panitia: "Panitia", sistem: "Sistem" };

/** Riwayat status lengkap (jejak audit) untuk pengajuan / usulan. */
export function StatusTimeline({ logs, labels }: { logs: StatusLogRow[]; labels: Record<string, string> }) {
  if (logs.length === 0) return null;
  return (
    <div className="mt-5 border-t border-stone-100 pt-4">
      <p className="mb-3 flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-stone-400">
        <History className="h-4 w-4" /> Riwayat Status
      </p>
      <ol className="relative space-y-3 border-l-2 border-emerald-100 pl-4">
        {logs.map((log) => (
          <li key={log.id} className="relative">
            <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            <p className="text-[13px] font-extrabold text-ink">{labels[log.status] ?? log.status}</p>
            {log.note && <p className="mt-0.5 text-[12px] leading-relaxed text-stone-500">{log.note}</p>}
            <p className="mt-0.5 text-[11px] font-semibold text-stone-400">
              {fmt(log.created_at)} · {ACTOR_LABEL[log.actor] ?? log.actor}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
