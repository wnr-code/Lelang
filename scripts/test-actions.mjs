// Uji end-to-end logika bisnis server actions asli (dengan mock Next.js).
// Jalankan: node --import ./scripts/test-hooks.mjs scripts/test-actions.mjs
// Mode SQLite (tanpa env Supabase) — query/action async, semua di-await.
import assert from "node:assert";

const A = await import("../src/lib/actions.ts");
const Q = await import("../src/lib/queries.ts");
const { getDb, resetDb } = await import("../src/lib/db.ts");

let passed = 0;
function check(name, cond) {
  assert.ok(cond, "GAGAL: " + name);
  passed++;
  console.log("  ✓", name);
}
function fd(obj) {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, String(v));
  return f;
}
const jar = globalThis.__cookieJar;

console.log("== Reset & seed ==");
resetDb();
getDb();
check("seed: 2 kegiatan", (await Q.getAllEvents()).length === 2);
check("seed: 8 item kegiatan aktif", (await Q.getItemsWithStatus(1)).length === 8);

console.log("== Auth ==");
let r = await A.loginAction(null, fd({ password: "salah" }));
check("login salah ditolak", r.ok === false);
try {
  await A.loginAction(null, fd({ password: "cigatas-berbagi" }));
} catch (e) {
  check("login benar → redirect /panitia", String(e.digest).includes("/panitia"));
}
check("cookie sesi terpasang", jar.has("cigatas_panitia"));
const { isPanitia } = await import("../src/lib/auth.ts");
check("isPanitia true", await isPanitia());

console.log("== Guard: mutasi tanpa login ==");
jar.clear();
r = await A.createEventAction(null, fd({ title: "X" }));
check("createEvent tanpa login ditolak", r.ok === false);
// login lagi
try { await A.loginAction(null, fd({ password: "cigatas-berbagi" })); } catch {}

console.log("== Publik: ajukan bantuan ==");
r = await A.submitHelpAction(null, fd({ item_id: 6, nickname: "Teh Uji", qty: 15, message: "snack 15 bungkus" }));
check("submit berhasil", r.ok === true);
check("dapat kode lacak", /^CGT-/.test(r.code || ""));
const subCode = r.code;
const tracked = await Q.getSubmissionByCode(subCode);
check("lacak: status pending", tracked.status === "pending");
check("lacak: item benar", tracked.item_name === "Snack Anak");

console.log("== Panitia: setujui pengajuan ==");
r = await A.decideSubmissionAction(tracked.id, "approved", "Silakan antar ke balai warga.");
check("approve berhasil", r.ok === true);
check("status jadi approved", (await Q.getSubmissionByCode(subCode)).status === "approved");
const ful = await Q.getFulfillments(6);
check("fulfillment otomatis dibuat", ful.some((f) => f.person_name === "Teh Uji"));

console.log("== Panitia: terima barang & tetapkan PJ ==");
const fUji = ful.find((f) => f.person_name === "Teh Uji");
r = await A.toggleReceivedAction(fUji.id, true);
check("tandai diterima", r.ok === true);
r = await A.setPicAction(6, fUji.id);
check("tetapkan PJ", r.ok === true);
const item6 = (await Q.getItemsWithStatus(1)).find((i) => i.id === 6);
check("PJ tercatat", item6.pic_name === "Teh Uji");
check("received_qty bertambah", item6.received_qty >= 15);

console.log("== Panitia: tolak pengajuan lain ==");
const pendingAir = (await Q.getSubmissions(1, "pending")).find((s) => s.item_name === "Air Mineral");
if (pendingAir) {
  r = await A.decideSubmissionAction(pendingAir.id, "rejected", "Sudah cukup, terima kasih.");
  check("reject berhasil", r.ok === true);
  check("status jadi rejected", (await Q.getSubmissionByCode(pendingAir.track_code)).status === "rejected");
}

console.log("== Panitia: buat kegiatan baru + item ==");
r = await A.createEventAction(null, fd({ title: "Kerja Bakti Cigatas", description: "Bersih-bersih", event_date: "2026-12-01", location: "Balai Warga" }));
check("create event berhasil", r.ok === true);
const newEventId = r.id;
r = await A.addItemAction(null, fd({ event_id: newEventId, name: "Sapu", target_label: "10 Buah", unit: "Buah" }));
check("add item berhasil", r.ok === true);
const newItems = await Q.getItemsWithStatus(newEventId);
check("item punya target_qty numerik", newItems[0].target_qty === 10);
r = await A.setEventStatusAction(newEventId, "active");
check("aktifkan kegiatan", r.ok === true);
check("status active", (await Q.getEventById(newEventId)).status === "active");

console.log("== Panitia: sisa barang ==");
r = await A.addSurplusAction(null, fd({ event_id: 1, item_name: "Beras", qty: 2, qty_label: "2 Kg", condition: "sisa", decision: "disimpan", pic_name: "Panitia", outcome: "" }));
check("catat sisa berhasil", r.ok === true);
const surplus = await Q.getSurplus(1);
const newSurplus = surplus[surplus.length - 1];
check("sisa tercatat", newSurplus.item_name === "Beras");
r = await A.updateSurplusAction(null, fd({ id: newSurplus.id, decision: "disimpan", decision_note: "Masih layak", pic_name: "Panitia", outcome: "Disimpan di gudang" }));
check("update hasil sisa", r.ok === true);
check("outcome tersimpan", (await Q.getSurplus(1)).find((s) => s.id === newSurplus.id).outcome === "Disimpan di gudang");

console.log("== Panitia: selesaikan kegiatan → arsip ==");
r = await A.setEventStatusAction(1, "completed");
check("selesaikan kegiatan", r.ok === true);
check("masuk arsip", (await Q.getArchivedEvents()).some((e) => e.id === 1));
check("completed_at terisi", (await Q.getEventById(1)).completed_at !== null);

console.log("== Upload foto (kompres photon → WebP) ==");
// buat gambar uji kecil dengan sharp (hanya untuk test, bukan runtime)
const sharp = (await import("sharp")).default;
const imgBuf = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: { r: 5, g: 150, b: 105 } } }).jpeg().toBuffer();
const file = new File([imgBuf], "uji.jpg", { type: "image/jpeg" });
const fdf = new FormData();
fdf.set("event_id", "1");
fdf.set("caption", "Foto uji");
fdf.set("photo", file);
r = await A.uploadPhotoAction(null, fdf);
check("upload foto berhasil", r.ok === true);
const photos = await Q.getPhotos(1);
check("foto tersimpan di DB", photos.some((p) => p.caption === "Foto uji"));
const uploaded = photos.find((p) => p.caption === "Foto uji");
check("path pakai /api/uploads/", uploaded.file_path.startsWith("/api/uploads/"));
// verifikasi file fisik ada & terkompres
const fs = await import("node:fs");
const path = await import("node:path");
const fname = path.basename(uploaded.file_path);
const fpath = path.join(process.cwd(), "data", "uploads", fname);
check("file fisik ada", fs.existsSync(fpath));
const meta = await sharp(fpath).metadata();
check("terkompres ≤1600px", meta.width <= 1600);
check("format webp", meta.format === "webp");

console.log("== Validasi input ==");
r = await A.submitHelpAction(null, fd({ item_id: 6, nickname: "", qty: 5 }));
check("nama kosong ditolak", r.ok === false);
r = await A.addItemAction(null, fd({ event_id: 1, name: "", target_label: "5 Kg" }));
check("nama item kosong ditolak", r.ok === false);

console.log("== Ekspor PDF/Excel ==");
const E = await import("../src/lib/export.ts");
for (const scope of ["all", "collected", "pending"]) {
  const data = await E.buildExportData(1, scope);
  check(`buildExportData ${scope} ada`, data != null && Array.isArray(data.rows));
  const pdf = await E.generatePdf(data);
  check(`PDF ${scope} valid (%PDF)`, pdf.subarray(0, 4).toString() === "%PDF");
  const xlsx = await E.generateExcel(data);
  check(`XLSX ${scope} valid (PK)`, xlsx.subarray(0, 2).toString() === "PK");
}
{
  const all = await E.buildExportData(1, "all");
  const collected = await E.buildExportData(1, "collected");
  const pending = await E.buildExportData(1, "pending");
  check("scope collected hanya terpenuhi", collected.rows.every((r) => r.status === "Terpenuhi"));
  check("scope pending tanpa terpenuhi", pending.rows.every((r) => r.status !== "Terpenuhi"));
  check("collected + pending = all", collected.rows.length + pending.rows.length === all.rows.length);
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(await E.generatePdf(all));
  check("PDF bisa dibaca ulang", doc.getPageCount() >= 1);
}

console.log("== Logout ==");
await A.logoutAction().catch(() => {});
check("cookie dihapus", !jar.has("cigatas_panitia"));

console.log(`\n✅ SEMUA ${passed} PEMERIKSAAN LULUS`);
