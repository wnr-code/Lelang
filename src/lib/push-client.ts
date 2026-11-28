/** Helper push sisi-klien (dipakai PushReminder & NotificationSettings). Hanya dipanggil di browser. */

export type PushStatus = "loading" | "unsupported" | "off" | "on" | "denied";

export function urlB64ToUint8(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function readPushStatus(): Promise<{ status: PushStatus; endpoint: string }> {
  if (!pushSupported()) return { status: "unsupported", endpoint: "" };
  if (Notification.permission === "denied") return { status: "denied", endpoint: "" };
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    const sub = await reg.pushManager.getSubscription();
    if (sub && Notification.permission === "granted") return { status: "on", endpoint: sub.endpoint };
    return { status: "off", endpoint: "" };
  } catch {
    return { status: "off", endpoint: "" };
  }
}

export async function enablePush(nickname: string): Promise<{ ok: boolean; endpoint?: string; error?: string; denied?: boolean }> {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      return { ok: false, denied: perm === "denied", error: "Izin notifikasi belum diberikan. Aktifkan lewat pengaturan browser Android." };
    }
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const res = await fetch("/api/push/vapid");
    const { publicKey, error } = await res.json();
    if (!publicKey) throw new Error(error || "Kunci VAPID tidak tersedia.");
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(publicKey) as BufferSource });
    const save = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), nickname }),
    });
    const saved = await save.json();
    if (!save.ok) throw new Error(saved.error || "Gagal menyimpan langganan.");
    try {
      const cache = await caches.open("cigatas-meta");
      await cache.put("/__nickname", new Response(nickname));
    } catch {}
    return { ok: true, endpoint: sub.endpoint };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal mengaktifkan pengingat." };
  }
}

export async function disablePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      await fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
  } catch {}
}

export async function sendTestPush(endpoint: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/push/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint }) });
    const data = await res.json();
    return { ok: !!data.ok, error: data.ok ? undefined : data.error || data.status };
  } catch {
    return { ok: false, error: "Gagal mengirim notifikasi uji." };
  }
}
