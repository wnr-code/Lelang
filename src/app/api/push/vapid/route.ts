import { NextResponse } from "next/server";
import { getVapidKeys } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Kunci publik VAPID untuk pushManager.subscribe di browser. */
export async function GET() {
  try {
    const keys = await getVapidKeys();
    return NextResponse.json({ publicKey: keys.publicKey });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal membuat kunci VAPID." }, { status: 500 });
  }
}
