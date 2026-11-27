import { NextRequest, NextResponse } from "next/server";
import { isPanitia } from "@/lib/auth";
import { buildExportData, generateExcel, generatePdf, exportFileName } from "@/lib/export";
import type { ExportScope, ExportFormat } from "@/lib/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isPanitia())) {
    return NextResponse.json({ error: "Tidak diizinkan. Silakan login panitia." }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const eventId = Number(sp.get("event"));
  const scope = (sp.get("scope") || "all") as ExportScope;
  const format = (sp.get("format") || "pdf") as ExportFormat;

  if (!Number.isFinite(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "Kegiatan tidak valid." }, { status: 400 });
  }
  if (!["all", "collected", "pending"].includes(scope)) {
    return NextResponse.json({ error: "Pilihan data tidak valid." }, { status: 400 });
  }
  if (!["pdf", "xlsx"].includes(format)) {
    return NextResponse.json({ error: "Format tidak valid." }, { status: 400 });
  }

  const data = await buildExportData(eventId, scope);
  if (!data) return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });

  try {
    if (format === "xlsx") {
      const buf = await generateExcel(data);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${exportFileName(data, "xlsx")}"`,
          "Cache-Control": "no-store",
        },
      });
    }
    const buf = await generatePdf(data);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${exportFileName(data, "pdf")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Gagal membuat file ekspor." }, { status: 500 });
  }
}
