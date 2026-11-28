import { NextResponse } from "next/server";
import { isSupabaseConfigured, getSupabase } from "@/lib/supabase";

// Diagnosis produksi: cek konfigurasi runtime TANPA membocorkan nilai rahasia.
// Hanya menampilkan ada/tidaknya variabel + hasil koneksi Supabase.
export const dynamic = "force-dynamic";

export async function GET() {
  const env = {
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    SESSION_SECRET: Boolean(process.env.SESSION_SECRET),
    PANITIA_PASSWORD: Boolean(process.env.PANITIA_PASSWORD),
  };
  const runtime =
    typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers"
      ? "cloudflare-worker"
      : "node";

  let database: { ok: boolean; mode: string; events?: number; error?: string };
  if (isSupabaseConfigured()) {
    try {
      const { count, error } = await getSupabase()
        .from("events")
        .select("id", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      database = { ok: true, mode: "supabase", events: count ?? 0 };
    } catch (e) {
      database = {
        ok: false,
        mode: "supabase",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  } else {
    database = {
      ok: runtime !== "cloudflare-worker",
      mode: runtime === "cloudflare-worker" ? "belum-dikonfigurasi" : "sqlite",
      error:
        runtime === "cloudflare-worker"
          ? "Variabel runtime belum lengkap. Isi di Cloudflare Dashboard → Worker → Settings → Variables and Secrets (bukan variabel Build)."
          : undefined,
    };
  }

  const ready = env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && database.ok;
  return NextResponse.json(
    {
      app: "lelang-kebaikan-cigatas",
      runtime,
      env,
      database,
      ready,
      petunjuk: ready
        ? "Konfigurasi lengkap. Aplikasi siap dipakai."
        : "Lengkapi variabel runtime di Cloudflare: Worker lelang → Settings → Variables and Secrets. SUPABASE_SERVICE_ROLE_KEY / SESSION_SECRET / PANITIA_PASSWORD bertipe Secret.",
    },
    { status: ready ? 200 : 503 }
  );
}
