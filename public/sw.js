/* Service Worker Lelang Kebaikan Cigatas — push notification Android + aksi Hadir/Tidak. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

async function getNickname() {
  try {
    const cache = await caches.open("cigatas-meta");
    const r = await cache.match("/__nickname");
    return r ? await r.text() : "";
  } catch {
    return "";
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Lelang Kebaikan Cigatas";
  const hasEvent = Boolean(data.eventId);
  const options = {
    body: data.body || "Ada informasi baru dari panitia.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    image: data.image || undefined,
    tag: data.tag || "cigatas",
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || "/", eventId: data.eventId || null, type: data.type || "info" },
    actions: hasEvent
      ? [
          { action: "hadir", title: "✅ Hadir" },
          { action: "tidak", title: "🙏 Tidak" },
        ]
      : [{ action: "buka", title: "Buka" }],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const action = event.action;
  event.waitUntil(
    (async () => {
      if ((action === "hadir" || action === "tidak") && d.eventId) {
        let endpoint = "";
        try {
          const sub = await self.registration.pushManager.getSubscription();
          endpoint = sub ? sub.endpoint : "";
        } catch {}
        const nickname = await getNickname();
        try {
          await fetch("/api/rsvp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId: d.eventId, endpoint, nickname, answer: action }),
            keepalive: true,
          });
        } catch {}
        await self.registration.showNotification(
          action === "hadir" ? "Alhamdulillah, konfirmasi hadir tercatat ✅" : "Konfirmasi tercatat 🙏",
          {
            body:
              action === "hadir"
                ? "Jazakumullah khairan. Sampai jumpa di lokasi acara."
                : "Terima kasih sudah mengonfirmasi. Semoga bisa ikut di kegiatan berikutnya.",
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: "rsvp-" + d.eventId,
            data: { url: d.url || "/" },
          }
        );
        return;
      }
      const url = d.url || "/";
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if (c.url.endsWith(url) && "focus" in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })()
  );
});

/* Langganan kedaluwarsa / diganti browser: daftar ulang otomatis. */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch("/api/push/vapid");
        const { publicKey } = await res.json();
        const sub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey,
        });
        const nickname = await getNickname();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON(), nickname }),
        });
      } catch {}
    })()
  );
});
