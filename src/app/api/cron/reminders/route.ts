import { NextResponse } from "next/server";
import { sendDueReminders, getCronSecret } from "@/lib/push";
import { isPanitia } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Pemicu pengingat 4 jam sebelum acara.
 * - Cloudflare cron (scheduled) memanggil dengan header x-cron-key = CRON_SECRET.
 * - Panitia bisa memicu manual lewat cookie sesi (tombol di halaman notifikasi).
 */
async function run(req: Request) {
  const key = req.headers.get("x-cron-key") || new URL(req.url).searchParams.get("key") || "";
  const expected = await getCronSecret();
  const viaCron = Boolean(expected) && key === expected;
  const viaPanitia = await isPanitia();
  if (!viaCron && !viaPanitia) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }
  try {
    const res = await sendDueReminders();
    return NextResponse.json({ ok: true, ...res, at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal mengirim pengingat." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return run(req);
}
export async function GET(req: Request) {
  return run(req);
}
