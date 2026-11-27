"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Download } from "lucide-react";
import type { ExportScope } from "@/lib/export";

const SCOPES: Array<{ value: ExportScope; label: string; desc: string }> = [
  { value: "all", label: "Semua", desc: "Seluruh kebutuhan" },
  { value: "collected", label: "Sudah Terkumpul", desc: "Item terpenuhi" },
  { value: "pending", label: "Belum Terkumpul", desc: "Item belum terpenuhi" },
];

export function ExportPanel({ eventId }: { eventId: number }) {
  const [scope, setScope] = useState<ExportScope>("all");

  function download(format: "pdf" | "xlsx") {
    const url = `/api/export?event=${eventId}&scope=${scope}&format=${format}`;
    window.location.href = url;
  }

  return (
    <section className="card px-5 py-4">
      <div className="flex items-center gap-2">
        <Download className="h-4 w-4 text-emerald-600" />
        <h2 className="text-sm font-extrabold text-ink">Unduh Laporan</h2>
      </div>
      <p className="mt-1 text-xs text-stone-400">
        Pilih data yang ingin diunduh, lalu pilih format. File berisi target, terkumpul, kekurangan, status, dan penanggung jawab.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SCOPES.map((s) => (
          <button
            key={s.value}
            onClick={() => setScope(s.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ring-1 transition ${
              scope === s.value
                ? "bg-emerald-600 text-white ring-emerald-600"
                : "bg-white text-stone-500 ring-stone-200 hover:bg-emerald-50"
            }`}
            title={s.desc}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => download("pdf")} className="btn-primary px-4 py-2 text-xs">
          <FileText className="h-4 w-4" /> Unduh PDF
        </button>
        <button onClick={() => download("xlsx")} className="btn-secondary px-4 py-2 text-xs">
          <FileSpreadsheet className="h-4 w-4" /> Unduh Excel
        </button>
      </div>
    </section>
  );
}
