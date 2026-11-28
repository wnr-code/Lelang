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
const seedItems = await Q.getItemsWithStatus(1);
check("seed: 10 kebutuhan barang", seedItems.filter((i) => i.kind === "barang").length === 10);
check("seed: 5 kebutuhan tenaga", seedItems.filter((i) => i.kind === "tenaga").length === 5);
check("seed: kategori sembako", seedItems.find((i) => i.name === "Beras").category === "sembako");
check("seed: kategori barang", seedItems.find((i) => i.name === "Kantong Plastik").category === "barang");
check("seed: kategori tenaga", seedItems.find((i) => i.kind === "tenaga").category === "tenaga");
check("seed: kategori lainnya", seedItems.find((i) => i.name === "Kebutuhan Lainnya").category === "lainnya");
check("seed: juru parkir ada", seedItems.some((i) => i.name === "Juru Parkir"));

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
const longMessage = "snack 15 bungkus. " + "A".repeat(1500);
r = await A.submitHelpAction(null, fd({ item_id: 6, nickname: "Teh Uji", qty: 15, message: longMessage, contact: "081234567890" }));
check("submit berhasil", r.ok === true);
check("dapat kode lacak", /^CGT-/.test(r.code || ""));
const subCode = r.code;
const tracked = await Q.getSubmissionByCode(subCode);
check("lacak: status pending", tracked.status === "pending");
check("lacak: item benar", tracked.item_name === "Snack Anak");
check("pesan panjang tersimpan (>1000)", tracked.message.length > 1000);

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
check("jumlah pengajuan tercatat", item6.submitted_count >= 1);
check("jumlah disetujui tercatat", item6.approved_count >= 1);
check("tanggal penerimaan tercatat", item6.received_at !== null);
check("status pengajuan jadi selesai setelah diverifikasi", (await Q.getSubmissionByCode(subCode)).status === "done");

console.log("== Panitia: tolak pengajuan lain ==");
const pendingAir = (await Q.getSubmissions(1, "pending")).find((s) => s.item_name === "Air Mineral");
if (pendingAir) {
  r = await A.decideSubmissionAction(pendingAir.id, "rejected", "Sudah cukup, terima kasih.");
  check("reject berhasil", r.ok === true);
  check("status jadi rejected", (await Q.getSubmissionByCode(pendingAir.track_code)).status === "rejected");
}

console.log("== Infaq barang: jumlah + satuan ==");
r = await A.submitHelpAction(null, fd({ item_id: 7, nickname: "Bu Uji", qty: 5, unit: "Pcs", message: "Kantong plastik 5 pcs", contact: "081200000001" }));
check("ajukan barang berhasil", r.ok === true);
const trackedUnit = await Q.getSubmissionByCode(r.code);
check("satuan tersimpan", trackedUnit.unit === "Pcs");
check("label memakai satuan", trackedUnit.qty_label.includes("Pcs"));

console.log("== Bantuan tenaga ==");
const tenagaItem = (await Q.getItemsWithStatus(1)).find((i) => i.kind === "tenaga");
check("ada kebutuhan tenaga", Boolean(tenagaItem));
r = await A.submitHelpAction(null, fd({ item_id: tenagaItem.id, nickname: "Mas Tenaga", contact: "081200000002" }));
check("tenaga tanpa waktu ketersediaan ditolak", r.ok === false);
r = await A.submitHelpAction(null, fd({ item_id: tenagaItem.id, nickname: "Mas Tenaga", availability: "Sabtu, 07.00-12.00 WIB", qty: 1, contact: "081200000002" }));
check("tenaga dengan waktu berhasil", r.ok === true);
const tenagaSub = await Q.getSubmissionByCode(r.code);
check("pengajuan bertipe tenaga", tenagaSub.item_kind === "tenaga");
check("waktu ketersediaan tersimpan", tenagaSub.availability.includes("Sabtu"));

console.log("== Status: perlu konfirmasi -> disetujui -> selesai ==");
r = await A.decideSubmissionAction(tenagaSub.id, "needs_confirmation", "Mohon konfirmasi jamnya.");
check("tandai perlu konfirmasi", r.ok === true);
check("status perlu konfirmasi", (await Q.getSubmissionByCode(tenagaSub.track_code)).status === "needs_confirmation");
r = await A.decideSubmissionAction(tenagaSub.id, "approved", "Sudah jelas, silakan hadir.");
check("setujui bantuan tenaga", r.ok === true);
const fulTenaga = (await Q.getFulfillments(tenagaItem.id)).find((f) => f.person_name === "Mas Tenaga");
check("kesediaan tenaga tercatat", Boolean(fulTenaga));
check("disetujui belum berarti diterima", fulTenaga.received === 0);
r = await A.toggleReceivedAction(fulTenaga.id, true);
check("verifikasi penerimaan tenaga", r.ok === true);
check("status selesai setelah verifikasi", (await Q.getSubmissionByCode(tenagaSub.track_code)).status === "done");
const tenagaAfter = (await Q.getItemsWithStatus(1)).find((i) => i.id === tenagaItem.id);
check("tanggal penerimaan tenaga tercatat", tenagaAfter.received_at !== null);
check("jumlah diterima tenaga bertambah", tenagaAfter.received_qty >= 1);
r = await A.decideSubmissionAction(tenagaSub.id, "status-ngawur", "");
check("status keputusan tidak valid ditolak", r.ok === false);

console.log("== Panitia: buat kegiatan baru + item ==");
const longDesc = "Bersih-bersih. " + "B".repeat(3000);
r = await A.createEventAction(null, fd({ title: "Kerja Bakti Cigatas", description: longDesc, event_date: "2026-12-01", location: "Balai Warga" }));
check("create event berhasil", r.ok === true);
const newEventId = r.id;
check("deskripsi panjang tersimpan (>3000)", (await Q.getEventById(newEventId)).description.length > 3000);
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
r = await A.addSurplusAction(null, fd({ event_id: 1, item_name: "Kopi", qty: 1, qty_label: "1 Dus", condition: "sisa", decision: "disalurkan", pic_name: "Panitia", outcome: "Disalurkan ke warga sekitar" }));
check("sisa barang bisa disalurkan", r.ok === true);
check("keputusan disalurkan tersimpan", (await Q.getSurplus(1)).some((s) => s.decision === "disalurkan"));
r = await A.addSurplusAction(null, fd({ event_id: 1, item_name: "Uji", decision: "ngawur" }));
check("keputusan sisa tidak valid ditolak", r.ok === false);

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

console.log("== Route sajian foto (/api/foto) ==");
const fotoRoute = await import("../src/app/api/foto/[...key]/route.ts");
const fotoRes = await fotoRoute.GET(new Request("http://localhost/api/foto/" + fname), {
  params: Promise.resolve({ key: [fname] }),
});
check("route foto 200", fotoRes.status === 200);
check("content-type image/webp", fotoRes.headers.get("content-type") === "image/webp");
const fotoBytes = new Uint8Array(await fotoRes.arrayBuffer());
check("isi foto sama dengan file tersimpan", fotoBytes.length === fs.statSync(fpath).size);
const fotoMissing = await fotoRoute.GET(new Request("http://localhost/api/foto/tidak-ada.webp"), {
  params: Promise.resolve({ key: ["tidak-ada.webp"] }),
});
check("foto tidak ada → 404", fotoMissing.status === 404);
const { isWorkerd } = await import("../src/lib/storage.ts");
check("preview Node terdeteksi bukan workerd", isWorkerd() === false);

console.log("== Batas upload foto 2 MB ==");
const { randomBytes } = await import("node:crypto");
const raw = randomBytes(2400 * 2400 * 3);
const bigBuf = await sharp(raw, { raw: { width: 2400, height: 2400, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
check("foto uji >2 MB", bigBuf.length > 2 * 1024 * 1024);
const bigFile = new File([bigBuf], "besar.jpg", { type: "image/jpeg" });
const fdBig = new FormData();
fdBig.set("event_id", "1");
fdBig.set("caption", "Foto besar");
fdBig.set("photo", bigFile);
r = await A.uploadPhotoAction(null, fdBig);
check("upload >2 MB ditolak", r.ok === false);
check("pesan error menyebut 2 MB", /2 MB/.test(r.error || ""));

console.log("== Validasi input ==");
r = await A.submitHelpAction(null, fd({ item_id: 6, nickname: "", qty: 5, contact: "081234567890" }));
check("nama kosong ditolak", r.ok === false);
r = await A.submitHelpAction(null, fd({ item_id: 6, nickname: "Tanpa WA", qty: 5 }));
check("tanpa nomor WA ditolak", r.ok === false);
r = await A.submitHelpAction(null, fd({ item_id: 6, nickname: "WA Salah", qty: 5, contact: "123" }));
check("nomor WA tidak valid ditolak", r.ok === false);
r = await A.addItemAction(null, fd({ event_id: 1, name: "", target_label: "5 Kg" }));
check("nama item kosong ditolak", r.ok === false);

console.log("== Ekspor PDF/Excel ==");
const E = await import("../src/lib/export.ts");
for (const scope of ["all", "collected", "pending"]) {
  const data = await E.buildExportData(1, scope);
  check(`buildExportData ${scope} ada`, data != null && Array.isArray(data.rows));
  check(`export ${scope} memuat satuan/pengajuan/disetujui/tgl terima`, data.rows.every((row) => "unit" in row && "submitted" in row && "approved" in row && "receivedAt" in row));
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


console.log("== Fase 3: kategori, jam acara, countdown ==");
const ET = await import("../src/lib/event-time.ts");
r = await A.addItemAction(null, fd({ event_id: 1, name: "Juru Parkir Tambahan", target_label: "2 Orang", unit: "Orang", category: "tenaga" }));
check("tambah item kategori tenaga", r.ok === true);
{
  const it = (await Q.getItemsWithStatus(1)).find((i) => i.name === "Juru Parkir Tambahan");
  check("kind mengikuti kategori tenaga", it.kind === "tenaga" && it.category === "tenaga");
}
r = await A.addItemAction(null, fd({ event_id: 1, name: "Teh Celup", target_label: "5 Dus", unit: "Dus", category: "sembako" }));
check("tambah item kategori sembako", r.ok === true);
{
  const it = (await Q.getItemsWithStatus(1)).find((i) => i.name === "Teh Celup");
  check("kind barang untuk sembako", it.kind === "barang" && it.category === "sembako");
}
r = await A.createEventAction(null, fd({ title: "Uji Jam Acara", description: "x", event_date: "2026-12-23", event_time: "19:00", location: "Masjid" }));
check("buat acara dengan jam", r.ok === true);
{
  const ev = (await Q.getAllEvents()).find((e) => e.title === "Uji Jam Acara");
  check("event_time tersimpan 19:00", ev.event_time === "19:00");
  const starts = ET.eventStartsAt(ev);
  check("eventStartsAt WIB", starts.toISOString() === "2026-12-23T12:00:00.000Z");
  const remind = ET.reminderAt(starts);
  check("pengingat 4 jam sebelum (15:00 WIB)", remind.toISOString() === "2026-12-23T08:00:00.000Z");
  const c = ET.countdownParts(starts, new Date("2026-12-23T07:00:00.000Z"));
  check("countdown 5 jam", c.hours === 5 && c.days === 0 && c.past === false);
  check("formatEventTime", ET.formatEventTime("19:00") === "19.00 WIB");
  r = await A.updateEventAction(null, fd({ id: ev.id, title: "Uji Jam Acara", description: "x", event_date: "2026-12-23", event_time: "20:30", location: "Masjid" }));
  check("ubah jam acara", r.ok === true && (await Q.getEventById(ev.id)).event_time === "20:30");
}

console.log("== Fase 3: push, RSVP, pengingat ==");
const P = await import("../src/lib/push.ts");
const W = await import("../src/lib/webpush.ts");
const vapid1 = await P.getVapidKeys();
const vapid2 = await P.getVapidKeys();
check("kunci VAPID dibuat & stabil", vapid1.publicKey.length > 40 && vapid1.publicKey === vapid2.publicKey);
const cron1 = await P.getCronSecret();
const cron2 = await P.getCronSecret();
check("cron secret stabil", cron1.length >= 32 && cron1 === cron2);
const fakeSub = { endpoint: "https://push.example.com/sub-1", keys: { p256dh: "BPx" + "A".repeat(80), auth: "AUTH1234567890ab" } };
await P.saveSubscription(fakeSub, "Ikhwan Uji");
check("langganan tersimpan", (await P.listSubscriptions()).some((s) => s.endpoint === fakeSub.endpoint));
await P.saveSubscription(fakeSub, "Nama Baru");
check("langganan upsert (tidak ganda)", (await P.listSubscriptions()).filter((s) => s.endpoint === fakeSub.endpoint).length === 1);
await P.recordRsvp({ eventId: 1, endpoint: fakeSub.endpoint, nickname: "Ikhwan Uji", answer: "hadir" });
await P.recordRsvp({ eventId: 1, endpoint: fakeSub.endpoint, nickname: "Ikhwan Uji", answer: "tidak" });
{
  const sum = await P.getRsvpSummary(1);
  check("RSVP upsert jawaban terakhir", sum.tidak === 1 && sum.hadir === 0);
  check("RSVP recent ada", sum.recent.length === 1 && sum.recent[0].nickname === "Ikhwan Uji");
}
await P.recordRsvp({ eventId: 1, nickname: "Akhwat Uji", answer: "hadir" });
check("RSVP manual tanpa endpoint", (await P.getRsvpSummary(1)).hadir === 1);
await P.removeSubscription(fakeSub.endpoint);
check("langganan dihapus", !(await P.listSubscriptions()).some((s) => s.endpoint === fakeSub.endpoint));
{
  const due = await P.sendDueReminders(new Date("2026-12-23T08:30:00.000Z"));
  check("sendDueReminders berjalan tanpa error", typeof due.sent === "number" && typeof due.checked === "number");
}
const N = await import("../src/lib/notifications.ts");
{
  const list = await N.getMemberNotifications();
  check("notifikasi anggota ada", list.length >= 2);
  check("notifikasi punya judul+desc+waktu", list.every((n) => n.title && n.desc && n.timeLabel));
  check("badge jumlah nyata", (await N.getMemberNotifCount()) >= 1);
}

console.log("== Fase 3: enkripsi Web Push (RFC 8291) ==");
{
  const clientKp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const clientPub = new Uint8Array(await crypto.subtle.exportKey("raw", clientKp.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const sub = { endpoint: "https://push.example.com/x", keys: { p256dh: W.bytesToB64url(clientPub), auth: W.bytesToB64url(auth) } };
  const payload = JSON.stringify({ title: "Uji", body: "Hadir?", eventId: 1 });
  const body = await W.encryptPayload(sub, payload);
  const salt = body.slice(0, 16);
  const idlen = body[20];
  const serverPub = body.slice(21, 21 + idlen);
  const ciphertext = body.slice(21 + idlen);
  const serverKey = await crypto.subtle.importKey("raw", serverPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: serverKey }, clientKp.privateKey, 256));
  const enc2 = new TextEncoder();
  const concat2 = (...ps) => { const n = ps.reduce((a, p) => a + p.length, 0); const o = new Uint8Array(n); let k = 0; for (const p of ps) { o.set(p, k); k += p.length; } return o; };
  const hkdf2 = async (s, ikm, info, len) => { const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]); return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: s, info }, k, len * 8)); };
  const ikm = await hkdf2(auth, shared, concat2(enc2.encode("WebPush: info\0"), clientPub, serverPub), 32);
  const cek = await hkdf2(salt, ikm, enc2.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf2(salt, ikm, enc2.encode("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, aes, ciphertext));
  const text = new TextDecoder().decode(plain.slice(0, -1));
  check("payload terenkripsi bisa didekripsi klien", text === payload && plain[plain.length - 1] === 2);
  const keys = await W.generateVapidKeys();
  check("VAPID public key 65 byte", W.b64urlToBytes(keys.publicKey).length === 65);
}

console.log("== Logout ==");
await A.logoutAction().catch(() => {});
check("cookie dihapus", !jar.has("cigatas_panitia"));

console.log(`\n✅ SEMUA ${passed} PEMERIKSAAN LULUS`);
