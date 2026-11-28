"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellRing, BellOff, Send, Loader2, ChevronRight } from "lucide-react";
import { REMINDER_HOURS } from "@/lib/event-time";
import { NICKNAME_KEY } from "@/components/member-settings";
import { readPushStatus, enablePush, disablePush, sendTestPush, type PushStatus } from "@/lib/push-client";

/**
 * Pengaturan notifikasi anggota: satu sakelar untuk mengaktifkan / menonaktifkan
 * SEMUA notifikasi (pengingat acara, pengajian, laporan) di perangkat ini.
 * Ditempatkan di halaman Pengaturan agar rapi dan terpusat.
 */
export function NotificationSettings() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);
  const [endpoint, setEndpoint] = useState("");
  const [msg, setMsg] = useState("");

  const nickname = () => {
    try { return localStorage.getItem(NICKNAME_KEY) || ""; } catch { return ""; }
  };

  const refresh = useCallback(async () => {
    const r = await readPushStatus();
    setStatus(r.status);
    setEndpoint(r.endpoint);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const on = status === "on";
  const disabled = busy || status === "loading" || status === "unsupported";

  async function toggle() {
    if (disabled) return;
    setBusy(true);
    setMsg("");
    if (on) {
      await disablePush();
      setStatus("off");
      setEndpoint("");
      setMsg("Semua notifikasi dimatikan di perangkat ini.");
    } else {
      const r = await enablePush(nickname());
      if (r.ok) {
        setStatus("on");
        setEndpoint(r.endpoint || "");
        setMsg(`Alhamdulillah, semua notifikasi aktif. Pengingat muncul ${REMINDER_HOURS} jam sebelum acara.`);
      } else {
        setStatus(r.denied ? "denied" : "off");
        setMsg(r.error || "Gagal mengaktifkan notifikasi.");
      }
    }
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    setMsg("");
    const r = await sendTestPush(endpoint);
    setMsg(r.ok ? "Notifikasi uji terkirim — cek layar Android Anda." : `Gagal: ${r.error || "coba lagi"}`);
    setBusy(false);
  }

  return (
    <section className="card px-5 py-5">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
        <Bell className="h-4 w-4 text-emerald-700" /> Notifikasi
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">
        Atur pengingat acara ({REMINDER_HOURS} jam sebelum mulai, dengan tombol Hadir / Tidak), pengajian rutin, dan laporan kegiatan.
      </p>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50/70 px-4 py-3.5 ring-1 ring-emerald-100">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-500"}`}>
            {on ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold text-ink">Semua Notifikasi</p>
            <p className="text-[12px] font-semibold text-stone-500">
              {status === "loading" ? "Memeriksa…" : on ? "Aktif di perangkat ini" : status === "unsupported" ? "Tidak didukung browser ini" : status === "denied" ? "Izin diblokir browser" : "Nonaktif"}
            </p>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={on}
          aria-label="Aktifkan atau nonaktifkan semua notifikasi"
          onClick={toggle}
          disabled={disabled}
          className={`relative h-7 w-[52px] shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-emerald-600" : "bg-stone-300"}`}
        >
          <span className={`absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-all ${on ? "left-[26px]" : "left-0.5"}`}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />}
          </span>
        </button>
      </div>

      {status === "unsupported" && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[13px] font-semibold text-amber-800">
          Browser ini belum mendukung notifikasi push. Buka lewat Chrome Android, lalu tambahkan ke layar utama.
        </p>
      )}
      {status === "denied" && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-700">
          Izin notifikasi diblokir. Buka Setelan situs → Notifikasi → Izinkan, lalu muat ulang halaman.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {on && (
          <button onClick={test} disabled={busy} className="btn-secondary px-4 py-2 text-[13px]">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Coba Notifikasi
          </button>
        )}
        <Link href="/notifikasi" className="inline-flex items-center gap-1 text-[13px] font-bold text-emerald-700 hover:underline">
          Lihat daftar notifikasi <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {msg && <p className="mt-3 text-[13px] font-semibold leading-relaxed text-emerald-700">{msg}</p>}
    </section>
  );
}
