"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, BellOff, Send, CheckCircle2, XCircle, Loader2, Settings2, ChevronRight } from "lucide-react";
import { REMINDER_HOURS } from "@/lib/event-time";
import { readPushStatus, enablePush, disablePush, sendTestPush, type PushStatus } from "@/lib/push-client";

/**
 * Kartu pengingat push: aktifkan izin, langganan, uji kirim, dan RSVP Hadir/Tidak.
 * Notifikasi sistem Android muncul 4 jam sebelum acara dengan aksi Hadir / Tidak.
 *
 * `hideControls` (halaman Notifikasi): sembunyikan tombol aktivasi — pengaturan
 * notifikasi terpusat di halaman Pengaturan. RSVP & pengingat lokal tetap berjalan.
 */
export function PushReminder({
  eventId,
  eventTitle,
  eventSlug,
  startsAt,
  hideControls = false,
}: {
  eventId?: number;
  eventTitle?: string;
  eventSlug?: string;
  startsAt?: string | null;
  hideControls?: boolean;
}) {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [answer, setAnswer] = useState<"hadir" | "tidak" | null>(null);
  const [endpoint, setEndpoint] = useState<string>("");

  const nickname = () => {
    try { return localStorage.getItem("cigatas.nickname") || ""; } catch { return ""; }
  };

  const refresh = useCallback(async () => {
    const r = await readPushStatus();
    setStatus(r.status);
    setEndpoint(r.endpoint);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /* Pengingat lokal bila halaman terbuka saat jendela pengingat tiba (cadangan cron). */
  useEffect(() => {
    if (status !== "on" || !eventId || !startsAt) return;
    const start = new Date(startsAt).getTime();
    const remind = start - REMINDER_HOURS * 3600_000;
    const now = Date.now();
    if (now >= start) return;
    const key = `cigatas.local_reminder_${eventId}`;
    const fire = async () => {
      try {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, String(Date.now()));
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(`⏰ ${eventTitle || "Acara Cigatas"} — ${REMINDER_HOURS} jam lagi`, {
          body: "Insya Allah hadir? Tekan Hadir atau Tidak.",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: `acara-${eventId}`,
          requireInteraction: true,
          data: { url: eventSlug ? `/kegiatan/${eventSlug}` : "/notifikasi", eventId, type: "reminder" },
          actions: [
            { action: "hadir", title: "✅ Hadir" },
            { action: "tidak", title: "🙏 Tidak" },
          ],
        } as NotificationOptions);
      } catch {}
    };
    if (now >= remind) {
      fire();
      return;
    }
    const id = setTimeout(fire, Math.min(remind - now, 2_147_483_647));
    return () => clearTimeout(id);
  }, [status, eventId, startsAt, eventTitle, eventSlug]);

  async function enable() {
    setBusy(true);
    setMsg("");
    const r = await enablePush(nickname());
    if (r.ok) {
      setEndpoint(r.endpoint || "");
      setStatus("on");
      setMsg("Alhamdulillah, pengingat aktif. Notifikasi akan muncul 4 jam sebelum acara.");
    } else {
      setStatus(r.denied ? "denied" : "off");
      setMsg(r.error || "Gagal mengaktifkan pengingat.");
    }
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    await disablePush();
    setStatus("off");
    setEndpoint("");
    setMsg("Pengingat dimatikan di perangkat ini.");
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    setMsg("");
    const r = await sendTestPush(endpoint);
    setMsg(r.ok ? "Notifikasi uji terkirim — cek layar Android Anda." : `Gagal: ${r.error || "coba lagi"}`);
    setBusy(false);
  }

  async function rsvp(a: "hadir" | "tidak") {
    if (!eventId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, endpoint, nickname: nickname(), answer: a }),
      });
      if (res.ok) {
        setAnswer(a);
        setMsg(a === "hadir" ? "Alhamdulillah, konfirmasi hadir tercatat. Jazakumullah khairan." : "Konfirmasi tercatat. Semoga bisa ikut di kegiatan berikutnya.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card px-5 py-4">
      {hideControls ? (
        <Link href="/pengaturan" className="flex items-center gap-3 rounded-2xl bg-emerald-50/70 px-3.5 py-3 ring-1 ring-emerald-100 transition hover:bg-emerald-100/70">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${status === "on" ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-500"}`}>
            {status === "on" ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-extrabold text-ink">Pengingat acara {status === "on" ? "aktif" : "nonaktif"}</span>
            <span className="block text-[12px] font-semibold text-stone-500">Aktifkan / nonaktifkan semua notifikasi di Pengaturan</span>
          </span>
          <Settings2 className="h-4 w-4 shrink-0 text-emerald-700" />
          <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
        </Link>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              {status === "on" ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-extrabold text-ink">Pengingat Acara (Notifikasi Android)</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-stone-500">
                Notifikasi muncul di layar HP <b>{REMINDER_HOURS} jam sebelum acara</b> (contoh: mulai 19.00 → pengingat 15.00),
                lengkap dengan tombol <b>Hadir / Tidak</b> — tetap muncul walau aplikasi ditutup.
              </p>
            </div>
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

          <div className="mt-3 flex flex-wrap gap-2">
            {status === "on" ? (
              <>
                <button onClick={test} disabled={busy} className="btn-primary px-4 py-2 text-[14px]">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Coba Notifikasi
                </button>
                <button onClick={disable} disabled={busy} className="btn-secondary px-4 py-2 text-[14px]">
                  <BellOff className="h-4 w-4" /> Matikan
                </button>
              </>
            ) : (
              <button onClick={enable} disabled={busy || status === "unsupported" || status === "loading"} className="btn-primary px-4 py-2 text-[14px]">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />} Aktifkan Pengingat
              </button>
            )}
          </div>
        </>
      )}

      {eventId && (
        <div className="mt-4 rounded-2xl bg-emerald-50/70 px-3.5 py-3 ring-1 ring-emerald-100">
          <p className="text-[13px] font-extrabold text-emerald-800">Konfirmasi kehadiran {eventTitle ? `— ${eventTitle}` : ""}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => rsvp("hadir")}
              disabled={busy}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[14px] font-extrabold transition active:scale-[0.98] ${
                answer === "hadir" ? "bg-emerald-700 text-white" : "bg-white text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" /> Hadir
            </button>
            <button
              onClick={() => rsvp("tidak")}
              disabled={busy}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[14px] font-extrabold transition active:scale-[0.98] ${
                answer === "tidak" ? "bg-stone-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
              }`}
            >
              <XCircle className="h-4 w-4" /> Tidak
            </button>
          </div>
        </div>
      )}

      {msg && <p className="mt-3 text-[13px] font-semibold leading-relaxed text-emerald-700">{msg}</p>}
    </div>
  );
}
