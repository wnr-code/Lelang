// Proteksi spam untuk form publik TANPA akun: honeypot + jebakan waktu + rate limit.
// Berlaku untuk pengajuan infaq (submitHelp) dan usulan item baru (submitProposal).
import { isSupabaseConfigured, getSupabase, loadSqliteDb, throwIfError, TABLES } from "./supabase";

const MAX_PER_WINDOW = 8;
const WINDOW_MS = 60 * 60 * 1000; // 1 jam
const MIN_FILL_MS = 1200; // manusia butuh >1,2 detik mengisi form
const MAX_FORM_AGE_MS = 3 * 60 * 60 * 1000; // form kedaluwarsa setelah 3 jam

export type SpamResult = { ok: true; key: string } | { ok: false; error: string };

/** Ambil IP pemanggil bila tersedia (di belakang proxy Cloudflare). */
async function callerIp(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    return (h.get("x-forwarded-for") || h.get("x-real-ip") || "").split(",")[0].trim();
  } catch {
    return "";
  }
}

/**
 * Validasi anti-spam. `scope` membedakan pengajuan vs usulan.
 * Kunci rate limit: nomor WA (bila ada) atau IP, digabung scope.
 */
export async function checkSpam(formData: FormData, scope: string, contact: string): Promise<SpamResult> {
  // 1) Honeypot: field tersembunyi yang hanya diisi bot.
  const honeypot = String(formData.get("company") || formData.get("website") || "").trim();
  if (honeypot) return { ok: false, error: "Terdeteksi aktivitas otomatis. Pengajuan tidak diproses." };

  // 2) Jebakan waktu: form harus diisi wajar (tidak instan, tidak kedaluwarsa).
  const ts = Number(formData.get("_ts") || 0);
  if (!Number.isFinite(ts) || ts <= 0) {
    return { ok: false, error: "Form tidak valid. Muat ulang halaman lalu coba lagi." };
  }
  const elapsed = Date.now() - ts;
  if (elapsed < MIN_FILL_MS) return { ok: false, error: "Terlalu cepat. Mohon isi form dengan wajar lalu kirim lagi." };
  if (elapsed > MAX_FORM_AGE_MS) return { ok: false, error: "Form sudah kedaluwarsa. Muat ulang halaman lalu coba lagi." };

  // 3) Rate limit per kontak/IP.
  const digits = contact.replace(/\D/g, "");
  const ip = await callerIp();
  const key = `${scope}:${digits || ip || "anon"}`;
  const count = await readWindow(key);
  if (count >= MAX_PER_WINDOW) {
    return { ok: false, error: "Terlalu banyak pengajuan dalam waktu dekat. Coba lagi nanti (maks. 8 per jam)." };
  }
  return { ok: true, key };
}

async function readWindow(key: string): Promise<number> {
  const now = Date.now();
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabase().from(TABLES.rate_limits).select("window_start,count").eq("key", key).maybeSingle();
    throwIfError(error, "readWindow");
    if (!data) return 0;
    const start = new Date(String(data.window_start)).getTime();
    if (now - start > WINDOW_MS) return 0;
    return Number(data.count);
  }
  const { getDb } = await loadSqliteDb();
  const row = getDb().prepare("SELECT window_start, count FROM rate_limits WHERE key = ?").get(key) as { window_start: string; count: number } | undefined;
  if (!row) return 0;
  const start = new Date(row.window_start.includes("T") ? row.window_start : row.window_start.replace(" ", "T") + "Z").getTime();
  if (now - start > WINDOW_MS) return 0;
  return row.count;
}

/** Catat satu percobaan berhasil (panggil setelah insert sukses). */
export async function bumpRate(key: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const now = Date.now();
  if (isSupabaseConfigured()) {
    const sb = getSupabase();
    const { data } = await sb.from(TABLES.rate_limits).select("window_start,count").eq("key", key).maybeSingle();
    const start = data ? new Date(String(data.window_start)).getTime() : 0;
    const fresh = !data || now - start > WINDOW_MS;
    const { error } = await sb.from(TABLES.rate_limits).upsert({
      key,
      window_start: fresh ? nowIso : String(data!.window_start),
      count: fresh ? 1 : Number(data!.count) + 1,
    });
    throwIfError(error, "bumpRate");
    return;
  }
  const { getDb } = await loadSqliteDb();
  const db = getDb();
  const row = db.prepare("SELECT window_start, count FROM rate_limits WHERE key = ?").get(key) as { window_start: string; count: number } | undefined;
  const start = row ? new Date(row.window_start.includes("T") ? row.window_start : row.window_start.replace(" ", "T") + "Z").getTime() : 0;
  const fresh = !row || now - start > WINDOW_MS;
  db.prepare(
    `INSERT INTO rate_limits (key, window_start, count) VALUES (?,?,?)
     ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start, count=excluded.count`
  ).run(key, fresh ? nowIso.slice(0, 19).replace("T", " ") : row!.window_start, fresh ? 1 : row!.count + 1);
}
