// Langganan push, RSVP (Hadir/Tidak), dan pengingat otomatis 4 jam sebelum acara.
// Dua jalur: Supabase (produksi) & SQLite (preview lokal).
import { isSupabaseConfigured, getSupabase, loadSqliteDb, throwIfError, TABLES } from "./supabase";
import { getActiveEvents } from "./queries";
import { eventStartsAt, reminderAt, formatEventTime, REMINDER_HOURS } from "./event-time";
import { generateVapidKeys, sendWebPush, type VapidKeys, type PushSubscriptionData } from "./webpush";

export interface PushSubRow {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  nickname: string;
}

export interface RsvpRow {
  id: number;
  event_id: number;
  endpoint: string;
  nickname: string;
  answer: "hadir" | "tidak";
  created_at: string;
}

export interface ReminderPayload {
  type: "reminder" | "test";
  title: string;
  body: string;
  url: string;
  image?: string;
  tag: string;
  eventId?: number;
}

const VAPID_SUBJECT = "mailto:panitia@lelang.cgs.my.id";

/** Rahasia pemicu cron: env CRON_SECRET, atau dibuat sekali di app_settings. */
export async function getCronSecret(): Promise<string> {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET;
  const randomHex = () => {
    const b = crypto.getRandomValues(new Uint8Array(24));
    return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
  };
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    const { data, error } = await sb.from(TABLES.app_settings).select("value").eq("key", "cron_secret").maybeSingle();
    throwIfError(error, "getCronSecret");
    if (data?.value) return data.value as string;
    const secret = randomHex();
    const ins = await sb.from(TABLES.app_settings).upsert({ key: "cron_secret", value: secret });
    throwIfError(ins.error, "saveCronSecret");
    return secret;
  }
  const { getDb } = await loadSqliteDb();
  const db = getDb();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'cron_secret'").get() as { value: string } | undefined;
  if (row) return row.value;
  const secret = randomHex();
  db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('cron_secret', ?)").run(secret);
  return secret;
}

/** Kunci VAPID: dari env bila ada, selain itu disimpan di tabel app_settings (dibuat sekali). */
export async function getVapidKeys(): Promise<VapidKeys> {
  const envPub = process.env.VAPID_PUBLIC_KEY;
  const envPriv = process.env.VAPID_PRIVATE_KEY;
  if (envPub && envPriv) {
    try {
      return { publicKey: envPub, privateKeyJwk: JSON.parse(envPriv) as JsonWebKey, subject: process.env.VAPID_SUBJECT || VAPID_SUBJECT };
    } catch {
      // fallthrough ke penyimpanan
    }
  }
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    const { data, error } = await sb.from(TABLES.app_settings).select("value").eq("key", "vapid").maybeSingle();
    throwIfError(error, "getVapidKeys");
    if (data?.value) return JSON.parse(data.value as string) as VapidKeys;
    const keys = await generateVapidKeys(VAPID_SUBJECT);
    const ins = await sb.from(TABLES.app_settings).upsert({ key: "vapid", value: JSON.stringify(keys) });
    throwIfError(ins.error, "saveVapidKeys");
    return keys;
  }
  const { getDb } = await loadSqliteDb();
  const db = getDb();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'vapid'").get() as { value: string } | undefined;
  if (row) return JSON.parse(row.value) as VapidKeys;
  const keys = await generateVapidKeys(VAPID_SUBJECT);
  db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('vapid', ?)").run(JSON.stringify(keys));
  return keys;
}

export async function saveSubscription(sub: PushSubscriptionData, nickname: string): Promise<void> {
  const clean = nickname.trim().slice(0, 80);
  if (isSupabaseConfigured()) {
    const { error } = await getSupabase().from(TABLES.push_subscriptions).upsert(
      { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, nickname: clean, last_seen: new Date().toISOString() },
      { onConflict: "endpoint" }
    );
    throwIfError(error, "saveSubscription");
    return;
  }
  const { getDb } = await loadSqliteDb();
  getDb()
    .prepare(
      `INSERT INTO push_subscriptions (endpoint,p256dh,auth,nickname,last_seen) VALUES (?,?,?,?,datetime('now'))
       ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth, nickname=excluded.nickname, last_seen=datetime('now')`
    )
    .run(sub.endpoint, sub.keys.p256dh, sub.keys.auth, clean);
}

export async function removeSubscription(endpoint: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await getSupabase().from(TABLES.push_subscriptions).delete().eq("endpoint", endpoint);
    throwIfError(error, "removeSubscription");
    return;
  }
  const { getDb } = await loadSqliteDb();
  getDb().prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
}

export async function listSubscriptions(): Promise<PushSubRow[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabase().from(TABLES.push_subscriptions).select("*").order("id");
    throwIfError(error, "listSubscriptions");
    return (data ?? []) as PushSubRow[];
  }
  const { getDb } = await loadSqliteDb();
  return getDb().prepare("SELECT * FROM push_subscriptions ORDER BY id").all() as unknown as PushSubRow[];
}

export async function recordRsvp(p: { eventId: number; endpoint?: string; nickname: string; answer: "hadir" | "tidak" }): Promise<void> {
  const nickname = p.nickname.trim().slice(0, 80) || "Anggota";
  const endpoint = (p.endpoint || `manual:${nickname.toLowerCase()}`).slice(0, 500);
  if (isSupabaseConfigured()) {
    const { error } = await getSupabase().from(TABLES.event_rsvps).upsert(
      { event_id: p.eventId, endpoint, nickname, answer: p.answer, created_at: new Date().toISOString() },
      { onConflict: "event_id,endpoint" }
    );
    throwIfError(error, "recordRsvp");
    return;
  }
  const { getDb } = await loadSqliteDb();
  getDb()
    .prepare(
      `INSERT INTO event_rsvps (event_id,endpoint,nickname,answer) VALUES (?,?,?,?)
       ON CONFLICT(event_id,endpoint) DO UPDATE SET nickname=excluded.nickname, answer=excluded.answer, created_at=datetime('now')`
    )
    .run(p.eventId, endpoint, nickname, p.answer);
}

export async function getRsvpSummary(eventId: number): Promise<{ hadir: number; tidak: number; recent: RsvpRow[] }> {
  let rows: RsvpRow[];
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabase().from(TABLES.event_rsvps).select("*").eq("event_id", eventId).order("created_at", { ascending: false });
    throwIfError(error, "getRsvpSummary");
    rows = (data ?? []) as RsvpRow[];
  } else {
    const { getDb } = await loadSqliteDb();
    rows = getDb().prepare("SELECT * FROM event_rsvps WHERE event_id = ? ORDER BY created_at DESC").all(eventId) as unknown as RsvpRow[];
  }
  return {
    hadir: rows.filter((r) => r.answer === "hadir").length,
    tidak: rows.filter((r) => r.answer === "tidak").length,
    recent: rows.slice(0, 12),
  };
}

async function alreadySent(eventId: number, endpoint: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabase().from(TABLES.push_reminders).select("id").eq("event_id", eventId).eq("endpoint", endpoint).maybeSingle();
    throwIfError(error, "alreadySent");
    return Boolean(data);
  }
  const { getDb } = await loadSqliteDb();
  return Boolean(getDb().prepare("SELECT id FROM push_reminders WHERE event_id = ? AND endpoint = ?").get(eventId, endpoint));
}

async function markSent(eventId: number, endpoint: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const { error } = await getSupabase().from(TABLES.push_reminders).upsert({ event_id: eventId, endpoint, sent_at: new Date().toISOString() }, { onConflict: "event_id,endpoint" });
    throwIfError(error, "markSent");
    return;
  }
  const { getDb } = await loadSqliteDb();
  getDb().prepare("INSERT OR IGNORE INTO push_reminders (event_id, endpoint) VALUES (?, ?)").run(eventId, endpoint);
}

/**
 * Kirim pengingat untuk semua acara aktif yang sudah masuk jendela
 * [mulai - 4 jam, mulai). Dipanggil oleh cron Worker tiap 15 menit,
 * dan bisa dipicu manual oleh panitia. Idempoten (push_reminders).
 */
export async function sendDueReminders(now = new Date()): Promise<{ checked: number; sent: number; failed: number; events: string[] }> {
  const events = await getActiveEvents();
  const subs = await listSubscriptions();
  const keys = await getVapidKeys();
  let sent = 0;
  let failed = 0;
  const touched: string[] = [];

  for (const ev of events) {
    const starts = eventStartsAt(ev);
    if (!starts) continue;
    const remind = reminderAt(starts);
    if (now < remind || now >= starts) continue;
    touched.push(ev.title);
    const payload: ReminderPayload = {
      type: "reminder",
      title: `⏰ ${ev.title} — ${REMINDER_HOURS} jam lagi`,
      body: `Mulai pukul ${formatEventTime(ev.event_time) || "waktu setempat"}${ev.location ? ` di ${ev.location}` : ""}. Insya Allah hadir? Tekan Hadir atau Tidak.`,
      url: `/kegiatan/${ev.slug}`,
      image: ev.cover_image || "/images/hero-mosque.webp",
      tag: `acara-${ev.id}`,
      eventId: ev.id,
    };
    for (const s of subs) {
      if (await alreadySent(ev.id, s.endpoint)) continue;
      const res = await sendWebPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, keys);
      if (res.gone) {
        await removeSubscription(s.endpoint);
        continue;
      }
      if (res.ok) {
        await markSent(ev.id, s.endpoint);
        sent++;
      } else {
        failed++;
      }
    }
  }
  return { checked: events.length, sent, failed, events: touched };
}

/** Uji kirim push ke satu langganan (tombol "Coba notifikasi" di pengaturan). */
export async function sendTestPush(endpoint: string): Promise<{ ok: boolean; status: number; error?: string }> {
  const subs = await listSubscriptions();
  const s = subs.find((x) => x.endpoint === endpoint);
  if (!s) return { ok: false, status: 404, error: "Langganan tidak ditemukan." };
  const keys = await getVapidKeys();
  const payload: ReminderPayload = {
    type: "test",
    title: "🔔 Uji Notifikasi Cigatas",
    body: "Alhamdulillah, notifikasi muncul di layar Anda. Pengingat acara akan datang 4 jam sebelum mulai, dengan tombol Hadir / Tidak.",
    url: "/notifikasi",
    image: "/images/gavel.webp",
    tag: "uji-cigatas",
  };
  const res = await sendWebPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, keys, 120);
  if (res.gone) await removeSubscription(endpoint);
  return { ok: res.ok, status: res.status, error: res.error };
}
