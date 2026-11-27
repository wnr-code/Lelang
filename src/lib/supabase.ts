import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Klien Supabase sisi-server (service-role key, melewati RLS).
 *
 * Aktif bila SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY diisi.
 * Skema ada di supabase/schema.sql + supabase/seed.sql (sudah diterapkan
 * ke proyek Supabase via connector).
 *
 * PENTING: service-role key hanya boleh dipakai di server (route handler,
 * server action, server component). Jangan pernah mengeksposnya ke klien.
 *
 * Opsi `accessToken` membuat supabase-js melewati inisialisasi auth client
 * (tidak ada localStorage/BroadcastChannel) sehingga aman & lean di Cloudflare
 * Worker. Key service-role dikirim sebagai apikey + Authorization Bearer.
 */

let cached: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di environment."
    );
  }
  cached = createClient(url, key, {
    accessToken: async () => key,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-application-name": "lelang-kebaikan-cigatas" } },
  });
  return cached;
}

/** Lemparkan error PostgREST/Storage dengan pesan yang terbaca. */
export function throwIfError(error: { message: string } | null, context: string): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

/** Nama tabel publik di Supabase (sama dengan skema SQLite). */
export const TABLES = {
  events: "events",
  items: "items",
  submissions: "submissions",
  fulfillments: "fulfillments",
  surplus: "surplus",
  photos: "photos",
} as const;

/** Bucket Storage publik untuk foto kegiatan. */
export const PHOTO_BUCKET = "photos";
