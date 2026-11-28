import { NextResponse } from "next/server";
import { saveSubscription } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }; nickname?: string };
    const s = body.subscription;
    if (!s?.endpoint || !s.keys?.p256dh || !s.keys?.auth) {
      return NextResponse.json({ error: "Data langganan tidak lengkap." }, { status: 400 });
    }
    if (!/^https:\/\//.test(s.endpoint)) {
      return NextResponse.json({ error: "Endpoint tidak valid." }, { status: 400 });
    }
    await saveSubscription({ endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }, String(body.nickname || ""));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal menyimpan langganan." }, { status: 500 });
  }
}
