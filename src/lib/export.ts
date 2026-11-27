import "server-only";
import { getEventById, getItemsWithStatus } from "./queries";
import { ITEM_STATUS_LABEL } from "./types";
import type { EventRow, ItemWithStatus } from "./types";

export type ExportScope = "all" | "collected" | "pending";
export type ExportFormat = "pdf" | "xlsx";

export interface ExportRow {
  no: number;
  name: string;
  target: string;
  collected: string;
  remaining: string;
  status: string;
  pic: string;
}

export interface ExportData {
  event: EventRow;
  scope: ExportScope;
  scopeLabel: string;
  rows: ExportRow[];
  summary: { total: number; fulfilled: number; process: number; open: number };
  generatedAt: string;
}

export const SCOPE_LABEL: Record<ExportScope, string> = {
  all: "Semua Kebutuhan",
  collected: "Sudah Terkumpul",
  pending: "Belum Terkumpul",
};

function fmtDate(s: string | null): string {
  if (!s) return "-";
  const d = new Date(s + (s.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export async function buildExportData(eventId: number, scope: ExportScope): Promise<ExportData | null> {
  const event = await getEventById(eventId);
  if (!event) return null;
  const items = await getItemsWithStatus(eventId);

  const summary = {
    total: items.length,
    fulfilled: items.filter((i) => i.status === "fulfilled").length,
    process: items.filter((i) => i.status === "process").length,
    open: items.filter((i) => i.status === "open").length,
  };

  let filtered: ItemWithStatus[] = items;
  if (scope === "collected") filtered = items.filter((i) => i.status === "fulfilled");
  if (scope === "pending") filtered = items.filter((i) => i.status !== "fulfilled");

  const rows: ExportRow[] = filtered.map((i, idx) => {
    let remaining = "—";
    if (i.target_qty != null) {
      const rem = Math.max(0, i.target_qty - i.received_qty);
      remaining = rem > 0 ? `${rem}${i.unit ? " " + i.unit : ""}` : "Cukup";
    }
    return {
      no: idx + 1,
      name: i.name,
      target: i.target_label,
      collected: i.received_label || "0",
      remaining,
      status: ITEM_STATUS_LABEL[i.status],
      pic: i.pic_name || "—",
    };
  });

  return {
    event,
    scope,
    scopeLabel: SCOPE_LABEL[scope],
    rows,
    summary,
    generatedAt: new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" }),
  };
}

export function exportFileName(data: ExportData, format: ExportFormat): string {
  const ext = format === "pdf" ? "pdf" : "xlsx";
  return `laporan-${data.event.slug}-${data.scope}.${ext}`;
}

// ---------- Excel (exceljs) ----------

export async function generateExcel(data: ExportData): Promise<Buffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Lelang Kebaikan Cigatas";
  wb.created = new Date();
  const ws = wb.addWorksheet("Laporan", { views: [{ state: "frozen", ySplit: 6 }] });

  ws.columns = [
    { key: "no", width: 5 },
    { key: "name", width: 26 },
    { key: "target", width: 18 },
    { key: "collected", width: 18 },
    { key: "remaining", width: 16 },
    { key: "status", width: 16 },
    { key: "pic", width: 22 },
  ];

  const emerald = "FF059669";
  const cream = "FFFAF6EE";

  // Judul
  ws.mergeCells("A1:G1");
  const title = ws.getCell("A1");
  title.value = "LELANG KEBAIKAN CIGATAS";
  title.font = { bold: true, size: 16, color: { argb: emerald } };
  title.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 26;

  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = `${data.event.title} — ${data.scopeLabel}`;
  ws.getCell("A2").font = { bold: true, size: 12 };

  ws.mergeCells("A3:G3");
  ws.getCell("A3").value = `Tanggal kegiatan: ${fmtDate(data.event.event_date)}${data.event.location ? " · " + data.event.location : ""}`;
  ws.getCell("A3").font = { size: 10, color: { argb: "FF78716C" } };

  ws.mergeCells("A4:G4");
  ws.getCell("A4").value = `Ringkasan: ${data.summary.fulfilled} terpenuhi · ${data.summary.process} dalam proses · ${data.summary.open} dibuka (dari ${data.summary.total} item)`;
  ws.getCell("A4").font = { size: 10, color: { argb: "FF78716C" } };

  // Header tabel (baris 6)
  const header = ws.getRow(6);
  header.values = ["No", "Barang", "Target", "Terkumpul", "Kekurangan", "Status", "Penanggung Jawab"];
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: emerald } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF047857" } } };
  });
  header.height = 22;

  // Baris data
  data.rows.forEach((r, idx) => {
    const row = ws.addRow([r.no, r.name, r.target, r.collected, r.remaining, r.status, r.pic]);
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE7E5E4" } } };
      if (idx % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: cream } };
    });
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    const statusCell = row.getCell(6);
    const color = r.status === "Terpenuhi" ? "FF047857" : r.status === "Dalam proses" ? "FFB45309" : "FF0369A1";
    statusCell.font = { bold: true, color: { argb: color } };
    row.height = 20;
  });

  if (data.rows.length === 0) {
    ws.mergeCells(`A7:G7`);
    ws.getCell("A7").value = "Tidak ada data untuk pilihan ini.";
    ws.getCell("A7").font = { italic: true, color: { argb: "FF78716C" } };
  }

  // Catatan kaki
  const footRow = ws.addRow([]);
  const footIdx = footRow.number + 1;
  ws.mergeCells(`A${footIdx}:G${footIdx}`);
  ws.getCell(`A${footIdx}`).value = `Dibuat: ${data.generatedAt} · Satu Kepedulian, Banyak Kebaikan · Tidak memuat nominal uang`;
  ws.getCell(`A${footIdx}`).font = { size: 9, italic: true, color: { argb: "FFA8A29E" } };

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// ---------- PDF (pdf-lib: font tersemat, tanpa baca file disk) ----------

export async function generatePdf(data: ExportData): Promise<Buffer> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.setTitle(`Laporan ${data.event.title} — ${data.scopeLabel}`);
  doc.setAuthor("Lelang Kebaikan Cigatas");
  doc.setCreator("Lelang Kebaikan Cigatas");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const oblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  const emerald = rgb(0.02, 0.59, 0.41);
  const ink = rgb(0.12, 0.16, 0.22);
  const muted = rgb(0.47, 0.44, 0.42);
  const cream = rgb(0.98, 0.965, 0.933);
  const line = rgb(0.906, 0.898, 0.894);
  const white = rgb(1, 1, 1);

  // A4 landscape
  const W = 841.89;
  const H = 595.28;
  const M = 40;
  const pageW = W - M * 2;

  const cols = [
    { label: "No", w: 28, align: "center" as const },
    { label: "Barang", w: 150, align: "left" as const },
    { label: "Target", w: 100, align: "left" as const },
    { label: "Terkumpul", w: 100, align: "left" as const },
    { label: "Kurang", w: 80, align: "left" as const },
    { label: "Status", w: 95, align: "left" as const },
    { label: "Penanggung Jawab", w: pageW - 28 - 150 - 100 - 100 - 80 - 95, align: "left" as const },
  ];

  // Potong teks agar muat dalam kolom (pdf-lib tidak auto-truncate).
  const fit = (text: string, f: typeof font, size: number, maxW: number): string => {
    if (f.widthOfTextAtSize(text, size) <= maxW) return text;
    let t = text;
    while (t.length > 1 && f.widthOfTextAtSize(t + "…", size) > maxW) t = t.slice(0, -1);
    return t + "…";
  };

  let page = doc.addPage([W, H]);
  // y dihitung dari atas; konversi ke koordinat pdf-lib (dari bawah).
  const drawText = (text: string, x: number, yTop: number, opts: { f?: typeof font; size?: number; color?: ReturnType<typeof rgb>; align?: "left" | "center"; maxW?: number } = {}) => {
    const f = opts.f ?? font;
    const size = opts.size ?? 9;
    const color = opts.color ?? ink;
    let str = text;
    if (opts.maxW != null) str = fit(text, f, size, opts.maxW);
    let xx = x;
    if (opts.align === "center" && opts.maxW != null) {
      const tw = f.widthOfTextAtSize(str, size);
      xx = x + Math.max(0, (opts.maxW - tw) / 2);
    }
    page.drawText(str, { x: xx, y: H - yTop - size, size, font: f, color });
  };
  const rect = (x: number, yTop: number, w: number, h: number, color: ReturnType<typeof rgb>) => {
    page.drawRectangle({ x, y: H - yTop - h, width: w, height: h, color });
  };
  const hline = (yTop: number) => {
    page.drawLine({ start: { x: M, y: H - yTop }, end: { x: M + pageW, y: H - yTop }, thickness: 0.5, color: line });
  };

  // Header halaman pertama
  drawText("LELANG KEBAIKAN CIGATAS", M, 38, { f: bold, size: 18, color: emerald });
  drawText(`${data.event.title} — ${data.scopeLabel}`, M, 64, { f: bold, size: 13, color: ink, maxW: pageW });
  drawText(`Tanggal kegiatan: ${fmtDate(data.event.event_date)}${data.event.location ? "  ·  " + data.event.location : ""}`, M, 84, { size: 9, color: muted, maxW: pageW });
  drawText(`Ringkasan: ${data.summary.fulfilled} terpenuhi · ${data.summary.process} dalam proses · ${data.summary.open} dibuka (dari ${data.summary.total} item)`, M, 97, { size: 9, color: muted, maxW: pageW });

  const rowH = 22;
  let y = 120;

  const drawTableHeader = () => {
    rect(M, y, pageW, rowH, emerald);
    let x = M;
    for (const c of cols) {
      drawText(c.label, x + 5, y + 6, { f: bold, size: 9, color: white, align: c.align, maxW: c.w - 10 });
      x += c.w;
    }
    y += rowH;
  };
  drawTableHeader();

  if (data.rows.length === 0) {
    drawText("Tidak ada data untuk pilihan ini.", M + 5, y + 6, { f: oblique, size: 9, color: muted });
    y += rowH;
  }

  data.rows.forEach((r, idx) => {
    if (y + rowH > H - 60) {
      page = doc.addPage([W, H]);
      y = 40;
      drawTableHeader();
    }
    if (idx % 2 === 1) rect(M, y, pageW, rowH, cream);
    const vals = [String(r.no), r.name, r.target, r.collected, r.remaining, r.status, r.pic];
    let x = M;
    cols.forEach((c, ci) => {
      const isStatus = ci === 5;
      const color = isStatus
        ? r.status === "Terpenuhi" ? rgb(0.016, 0.47, 0.34) : r.status === "Dalam proses" ? rgb(0.706, 0.325, 0.035) : rgb(0.012, 0.41, 0.63)
        : ink;
      drawText(vals[ci], x + 5, y + 6, { f: isStatus ? bold : font, size: 9, color, align: c.align, maxW: c.w - 10 });
      x += c.w;
    });
    hline(y + rowH);
    y += rowH;
  });

  // Footer di setiap halaman
  const pages = doc.getPages();
  const foot = `Dibuat: ${data.generatedAt}  ·  Satu Kepedulian, Banyak Kebaikan  ·  Tidak memuat nominal uang`;
  pages.forEach((p, i) => {
    const fw = oblique.widthOfTextAtSize(foot, 8);
    p.drawText(foot, { x: (W - fw) / 2, y: 30, size: 8, font: oblique, color: muted });
    const pn = `Halaman ${i + 1}/${pages.length}`;
    p.drawText(pn, { x: W - M - font.widthOfTextAtSize(pn, 8), y: 30, size: 8, font, color: muted });
  });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
