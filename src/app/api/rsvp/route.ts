import { NextResponse } from "next/server";
import { recordRsvp } from "@/lib/push";
import { getEventById } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Konfirmasi kehadiran dari tombol notifikasi (Hadir/Tidak) atau halaman acara. */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { eventId?: number; endpoint?: string; nickname?: string; answer?: string };
    const eventId = Number(body.eventId);
    const answer = body.answer === "hadir" ? "hadir" : body.answer === "tidak" ? "tidak" : null;
    if (!Number.isFinite(eventId) || eventId <= 0 || !answer) {
      return NextResponse.json({ error: "eventId dan answer (hadir/tidak) wajib valid." }, { status: 400 });
    }
    const ev = await getEventById(eventId);
    if (!ev) return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });
    await recordRsvp({ eventId, endpoint: body.endpoint, nickname: String(body.nickname || ""), answer });
    return NextResponse.json({ ok: true, answer });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Gagal menyimpan konfirmasi." }, { status: 500 });
  }
}
