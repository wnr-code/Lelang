import { NextResponse } from "next/server";
import { removeSubscription } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { endpoint?: string };
    if (!body.endpoint) return NextResponse.json({ error: "Endpoint wajib diisi." }, { status: 400 });
    await removeSubscription(body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal menghapus langganan." }, { status: 500 });
  }
}
