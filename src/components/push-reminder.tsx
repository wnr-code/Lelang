"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, BellOff, Send, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { REMINDER_HOURS } from "@/lib/event-time";

function urlB64ToUint8(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Status = "loading" | "unsupported" | "off" | "on" | "denied";

/**
 * Kartu pengingat push: aktifkan izin, langganan, uji kirim, dan RSVP Hadir/Tidak.
 * Notifikasi sistem Android muncul 4 jam sebelum acara dengan aksi Hadir / Tidak.
 */
export function PushReminder({
  eventId,
  eventTitle,
  eventSlug,
  startsAt,
}: {
  eventId?: number;
  eventTitle?: string;
  eventSlug?: string;
  startsAt?: string | null;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [answer, setAnswer] = useState<"hadir" | "tidak" | null>(null);
  const [endpoint, setEndpoint] = useState<string>("");

  const nickname = () => {
    try { return localStorage.getItem("cigatas.nickname") || ""; } catch { return ""; }
  };

  const refresh = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      if (sub && Notification.permission === "granted") {
        setEndpoint(sub.endpoint);
        setStatus("on");
      } else {
        setStatus("off");
      }
    } catch {
      setStatus("off");
    }
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
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "off");
        setMsg("Izin notifikasi belum diberikan. Aktifkan lewat pengaturan browser Android.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const res = await fetch("/api/push/vapid");
      const { publicKey, error } = await res.json();
      if (!publicKey) throw new Error(error || "Kunci VAPID tidak tersedia.");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(publicKey) as BufferSource });
      const name = nickname();
      const save = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), nickname: name }),
      });
      const saved = await save.json();
      if (!save.ok) throw new Error(saved.error || "Gagal menyimpan langganan.");
      try {
        const cache = await caches.open("cigatas-meta");
        await cache.put("/__nickname", new Response(name));
      } catch {}
      setEndpoint(sub.endpoint);
      setStatus("on");
      setMsg("Alhamdulillah, pengingat aktif. Notifikasi akan muncul 4 jam sebelum acara.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Gagal mengaktifkan pengingat.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setStatus("off");
      setEndpoint("");
      setMsg("Pengingat dimatikan di perangkat ini.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/push/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint }) });
      const data = await res.json();
      setMsg(data.ok ? "Notifikasi uji terkirim — cek layar Android Anda." : `Gagal: ${data.error || data.status}`);
    } catch {
      setMsg("Gagal mengirim notifikasi uji.");
    } finally {
      setBusy(false);
    }
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
