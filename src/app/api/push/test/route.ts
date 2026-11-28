import { NextResponse } from "next/server";
import { sendTestPush } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Kirim notifikasi uji ke langganan milik pemanggil (endpoint dari browser sendiri). */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { endpoint?: string };
    if (!body.endpoint) return NextResponse.json({ error: "Endpoint wajib diisi." }, { status: 400 });
    const res = await sendTestPush(body.endpoint);
    return NextResponse.json(res, { status: res.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal mengirim uji." }, { status: 500 });
  }
}
