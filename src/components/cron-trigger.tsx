"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";

/** Tombol panitia: kirim pengingat yang sudah jatuh tempo sekarang (tanpa menunggu cron). */
export function CronTrigger() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/cron/reminders", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMsg(
          data.sent > 0
            ? `Terkirim ${data.sent} pengingat untuk: ${data.events.join(", ")}.`
            : "Belum ada acara dalam jendela pengingat (4 jam sebelum mulai), atau semua langganan sudah dikirimi."
        );
      } else {
        setMsg(data.error || "Gagal mengirim pengingat.");
      }
    } catch {
      setMsg("Gagal menghubungi server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card px-5 py-4">
      <p className="text-sm font-extrabold text-ink">Pengingat Push Anggota</p>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">
        Cron otomatis mengirim notifikasi 4 jam sebelum acara mulai (tombol Hadir / Tidak). Tombol ini mengirim yang sudah jatuh tempo sekarang.
      </p>
      <button onClick={run} disabled={busy} className="btn-primary mt-3 px-4 py-2 text-[14px]">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Kirim Pengingat Sekarang
      </button>
      {msg && <p className="mt-2 text-xs font-semibold text-emerald-700">{msg}</p>}
    </div>
  );
}
