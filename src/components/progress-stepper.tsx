import { Fragment } from "react";
import { Check } from "lucide-react";

const DEFAULT_LABELS = [
  "Kegiatan Ditetapkan",
  "Kebutuhan Dibuat",
  "Pengajuan Masuk",
  "Barang Diterima",
  "Laporan Selesai",
];

/**
 * Progress Stepper horizontal 1–5: progres kegiatan secara keseluruhan,
 * BUKAN tahapan persetujuan wajib tiap anggota.
 * `current` = indeks (0-based) tahap yang sedang berjalan; 5 bila semua selesai.
 */
export function ProgressStepper({ current, labels = DEFAULT_LABELS }: { current: number; labels?: string[] }) {
  return (
    <div className="card px-3 py-4 sm:px-5">
      <ol className="flex items-start">
        {labels.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="relative flex flex-1 flex-col items-center">
              {i > 0 && (
                <span
                  className={`absolute right-1/2 top-[14px] h-[3px] w-full rounded-full ${i <= current ? "bg-emerald-500" : "bg-stone-200"}`}
                  aria-hidden
                />
              )}
              <span
                className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-extrabold transition ${
                  done
                    ? "bg-emerald-600 text-white"
                    : active
                      ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                      : "bg-stone-200 text-stone-400"
                }`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={`mt-1.5 px-0.5 text-center text-[10px] font-bold leading-tight sm:text-[11px] ${
                  done || active ? "text-emerald-800" : "text-stone-400"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
