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
  // Field anti-spam default: honeypot kosong + jebakan waktu sudah "diisi" 5 detik lalu.
  f.set("company", "");
  f.set("_ts", String(Date.now() - 5000));
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


console.log("== Fase 4: usulan item baru (proposal) ==");
const SL = await import("../src/lib/status-log.ts");
// Pastikan event 1 aktif kembali (uji sebelumnya mungkin mengarsipkan).
await A.setEventStatusAction(1, "active");
r = await A.submitProposalAction(null, fd({ event_id: 1, name: "", nickname: "Pengusul" }));
check("usulan tanpa nama ditolak", r.ok === false);
r = await A.submitProposalAction(null, fd({ event_id: 1, name: "Terpal", nickname: "" }));
check("usulan tanpa nama panggilan ditolak", r.ok === false);
r = await A.submitProposalAction(null, fd({ event_id: 1, name: "Terpal Bambu", qty: 4, unit: "Lembar", category: "barang", nickname: "Ikhwan Pengusul", contact: "081234500001", note: "Untuk alas duduk" }));
check("usulan valid berhasil", r.ok === true);
check("kode usulan prefix CGU-", /^CGU-/.test(r.code || ""));
const propCode = r.code;
{
  const prop = await Q.getProposalByCode(propCode);
  check("usulan tercatat pending", prop.status === "pending");
  check("usulan punya kegiatan & tanggal", Boolean(prop.event_title) && Boolean(prop.created_at));
  const logs = await SL.getStatusLogs("proposal", prop.id);
  check("usulan punya riwayat status", logs.length === 1 && logs[0].status === "pending");
}
// honeypot terisi → ditolak
r = await A.submitProposalAction(null, fd({ event_id: 1, name: "Bot Item", nickname: "Bot", company: "http://spam.example" }));
check("honeypot terisi ditolak", r.ok === false && /otomatis/.test(r.error));
// jebakan waktu: terlalu instan
{
  const f = new FormData();
  f.set("company", ""); f.set("_ts", String(Date.now()));
  f.set("event_id", "1"); f.set("name", "Instan"); f.set("nickname", "Cepat");
  r = await A.submitProposalAction(null, f);
  check("submit terlalu cepat ditolak", r.ok === false && /cepat/.test(r.error));
}
// ubah usulan oleh panitia
{
  const prop = await Q.getProposalByCode(propCode);
  r = await A.updateProposalAction(null, fd({ id: prop.id, name: "Terpal Bambu Tebal", qty_label: "4 Lembar", unit: "Lembar", category: "barang", note: "Diperbarui" }));
  check("panitia bisa mengubah usulan", r.ok === true);
  check("nama usulan berubah", (await Q.getProposalByCode(propCode)).name === "Terpal Bambu Tebal");
}
// setujui → jadi item resmi
{
  const prop = await Q.getProposalByCode(propCode);
  const before = (await Q.getItemsWithStatus(1)).length;
  r = await A.decideProposalAction(null, fd({ id: prop.id, decision: "approved", note: "Silakan, bermanfaat" }));
  check("setujui usulan berhasil", r.ok === true);
  const after = await Q.getItemsWithStatus(1);
  check("usulan disetujui jadi item resmi", after.length === before + 1 && after.some((i) => i.name === "Terpal Bambu Tebal"));
  const prop2 = await Q.getProposalByCode(propCode);
  check("status usulan approved + link item", prop2.status === "approved" && prop2.approved_item_id != null);
  check("riwayat usulan bertambah", (await SL.getStatusLogs("proposal", prop.id)).length >= 2);
  // tidak bisa diputuskan dua kali
  r = await A.decideProposalAction(null, fd({ id: prop.id, decision: "rejected" }));
  check("usulan sudah diputuskan tidak bisa diubah lagi", r.ok === false);
}
// tolak usulan lain
r = await A.submitProposalAction(null, fd({ event_id: 1, name: "Barang Tidak Perlu", nickname: "Pengusul 2", contact: "081234500002" }));
{
  const prop = await Q.getProposalByCode(r.code);
  const rej = await A.decideProposalAction(null, fd({ id: prop.id, decision: "rejected", note: "Belum dibutuhkan" }));
  check("tolak usulan berhasil", rej.ok === true && (await Q.getProposalByCode(r.code)).status === "rejected");
}
// guard: usulan tanpa login tidak bisa diputuskan
{
  jar.clear();
  const prop = await Q.getProposalByCode(propCode);
  r = await A.decideProposalAction(null, fd({ id: prop.id, decision: "approved" }));
  check("putuskan usulan tanpa login ditolak", r.ok === false);
  try { await A.loginAction(null, fd({ password: "cigatas-berbagi" })); } catch {}
}
// rate limit: >8 per jam per kontak ditolak
{
  let blocked = false;
  for (let i = 0; i < 10; i++) {
    const rr = await A.submitProposalAction(null, fd({ event_id: 1, name: "Spam " + i, nickname: "Spammer", contact: "089999999999" }));
    if (!rr.ok && /jam/.test(rr.error || "")) { blocked = true; break; }
  }
  check("rate limitmemblokir spam", blocked);
}

console.log("== Fase 4: riwayat status pengajuan infaq ==");
{
  const openItem = (await Q.getItemsWithStatus(1)).find((i) => i.is_open) || (await Q.getItemsWithStatus(1))[0];
  const rr = await A.submitHelpAction(null, fd({ item_id: openItem.id, nickname: "Ikhwan Riwayat", qty: 2, unit: "Kg", contact: "081234500010" }));
  check("pengajuan infaq berhasil", rr.ok === true);
  const tracked = await Q.getSubmissionByCode(rr.code);
  const logs = await SL.getStatusLogs("submission", tracked.id);
  check("pengajuan infaq punya riwayat awal", logs.length >= 1 && logs[0].status === "pending");
  await A.decideSubmissionAction(tracked.id, "approved", "Disetujui");
  const logs2 = await SL.getStatusLogs("submission", tracked.id);
  check("riwayat bertambah setelah keputusan", logs2.length >= 2 && logs2.some((l) => l.status === "approved"));
}

console.log("== Fase 4: WhatsApp panitia & dashboard ==");
r = await A.setPanitiaWaAction(null, fd({ panitia_wa: "0812-3456-7890" }));
check("set WA panitia berhasil", r.ok === true);
check("WA panitia ternormalisasi 62", (await Q.getPanitiaWa()) === "6281234567890");
{
  const counts = await Q.getDashboardCounts();
  check("dashboard punya proposalsPending", typeof counts.proposalsPending === "number");
}

console.log("== Kelola Pengajuan: satu tombol & konsistensi alur ==");
{
  const FLOW = await import("../src/lib/submission-flow.ts");
  // Transisi sah
  check("advance pending→approved", FLOW.resolveTransition("pending", "advance").to === "approved");
  check("advance approved→done", FLOW.resolveTransition("approved", "advance").to === "done");
  check("advance needs_confirmation→approved", FLOW.resolveTransition("needs_confirmation", "advance").to === "approved");
  check("advance rejected→approved", FLOW.resolveTransition("rejected", "advance").to === "approved");
  check("advance done→null (selesai)", FLOW.resolveTransition("done", "advance").error);
  // Transisi tidak sah (jangan asal-asalan)
  check("receive dari pending ditolak", FLOW.resolveTransition("pending", "receive").error);
  check("receive dari rejected ditolak", FLOW.resolveTransition("rejected", "receive").error);
  check("reject pengajuan done ditolak", FLOW.resolveTransition("done", "reject").error);
  check("approve pengajuan done ditolak", FLOW.resolveTransition("done", "approve").error);
  check("undo_receive hanya dari done/approved", FLOW.resolveTransition("pending", "undo_receive").error);
  check("label utama pending = Setujui", FLOW.primaryActionLabel("pending") === "Setujui Pengajuan");
  check("label utama approved = Tandai Diterima", FLOW.primaryActionLabel("approved") === "Tandai Diterima Fisik");
  check("label utama done = null", FLOW.primaryActionLabel("done") === null);

  // End-to-end via server action (SQLite)
  const item = (await Q.getItemsWithStatus(1)).find((i) => i.is_open) || (await Q.getItemsWithStatus(1))[0];
  const rr = await A.submitHelpAction(null, fd({ item_id: item.id, nickname: "Uji Satu Tombol", qty: 3, unit: "Kg", contact: "081234500099" }));
  check("pengajuan uji dibuat", rr.ok === true);
  const t0 = await Q.getSubmissionByCode(rr.code);
  check("awal pending", t0.status === "pending");
  check("pending belum punya catatan pemenuhan", !(await Q.getFulfillments(item.id)).some((f) => f.submission_id === t0.id));
  const receivedBefore = (await Q.getItemsWithStatus(1)).find((i) => i.id === item.id).received_qty;

  // Tidak boleh langsung diterima dari pending
  const badReceive = await A.decideSubmissionAction(t0.id, "done", "lompat");
  check("server menolak pending→done langsung", badReceive.ok === false);
  check("status tetap pending setelah aksi tak sah", (await Q.getSubmissionByCode(rr.code)).status === "pending");

  // Satu tombol: pending → approved (belum diterima)
  const a1 = await A.advanceSubmissionAction(t0.id, "catat kesediaan");
  check("advance ke approved berhasil", a1.ok === true && a1.status === "approved");
  const t1 = await Q.getSubmissionByCode(rr.code);
  check("status approved di tempat", t1.status === "approved");
  const f1 = (await Q.getFulfillments(item.id)).find((f) => f.submission_id === t0.id);
  check("approved membuat tepat satu catatan pemenuhan", Boolean(f1) && f1.received === 0);
  const itemAfterApprove = (await Q.getItemsWithStatus(1)).find((i) => i.id === item.id);
  check("approved TIDAK menambah jumlah diterima", itemAfterApprove.received_qty === receivedBefore);

  // Tidak boleh menolak/mengubah yang sudah diterima nanti; tapi approved masih bisa ditolak
  const rej = await A.decideSubmissionAction(t0.id, "rejected", "batal");
  check("approved bisa ditolak", rej.ok === true && rej.status === "rejected");
  check("rejected menghapus catatan pemenuhan belum diterima", !(await Q.getFulfillments(item.id)).some((f) => f.submission_id === t0.id));
  const a2 = await A.advanceSubmissionAction(t0.id);
  check("advance rejected→approved", a2.ok === true && a2.status === "approved");

  // Satu tombol: approved → done (diterima fisik)
  const a3 = await A.advanceSubmissionAction(t0.id);
  check("advance ke done berhasil", a3.ok === true && a3.status === "done");
  const t2 = await Q.getSubmissionByCode(rr.code);
  check("status done di tempat", t2.status === "done");
  const f2 = (await Q.getFulfillments(item.id)).find((f) => f.submission_id === t0.id);
  check("done = diterima fisik + tanggal", f2 && f2.received === 1 && f2.received_at);
  check("getSubmissions membawa received_at", (await Q.getSubmissions(1, "done")).find((s) => s.id === t0.id)?.received_at);

  // done tidak boleh ditolak / disetujui ulang tanpa batalkan terima
  check("server menolak reject pada done", (await A.decideSubmissionAction(t0.id, "rejected", "")).ok === false);
  check("server menolak approve pada done", (await A.decideSubmissionAction(t0.id, "approved", "")).ok === false);
  check("advance pada done ditolak (sudah selesai)", (await A.advanceSubmissionAction(t0.id)).ok === false);
  check("status tetap done setelah aksi tak sah", (await Q.getSubmissionByCode(rr.code)).status === "done");

  // Batalkan diterima → approved (belum diterima)
  const undo = await A.undoReceiveSubmissionAction(t0.id);
  check("batalkan diterima berhasil", undo.ok === true && undo.status === "approved");
  const f3 = (await Q.getFulfillments(item.id)).find((f) => f.submission_id === t0.id);
  check("setelah batal: catatan tetap ada, belum diterima", f3 && f3.received === 0 && !f3.received_at);
  check("status kembali approved", (await Q.getSubmissionByCode(rr.code)).status === "approved");

  // Hapus catatan pemenuhan → pengajuan kembali menunggu (konsisten)
  const del = await A.deleteFulfillmentAction(f3.id);
  check("hapus catatan pemenuhan berhasil", del.ok === true);
  check("pengajuan kembali pending setelah catatan dihapus", (await Q.getSubmissionByCode(rr.code)).status === "pending");
  check("catatan pemenuhan terhapus", !(await Q.getFulfillments(item.id)).some((f) => f.submission_id === t0.id));

  // Invarian: tidak ada duplikat catatan pemenuhan per pengajuan (indeks unik)
  const allFul = await Q.getFulfillments(item.id);
  const bySub = allFul.filter((f) => f.submission_id != null).map((f) => f.submission_id);
  check("tidak ada duplikat submission_id pada pemenuhan", new Set(bySub).size === bySub.length);

  // Riwayat status tercatat untuk transisi
  const logs = await SL.getStatusLogs("submission", t0.id);
  check("riwayat memuat approved & done", logs.some((l) => l.status === "approved") && logs.some((l) => l.status === "done"));

  // Jalur needs_confirmation → approved (satu tombol)
  const rr2 = await A.submitHelpAction(null, fd({ item_id: item.id, nickname: "Uji Konfirmasi", qty: 1, contact: "081234500098" }));
  const t3 = await Q.getSubmissionByCode(rr2.code);
  const nc = await A.decideSubmissionAction(t3.id, "needs_confirmation", "cek dulu");
  check("tandai perlu konfirmasi", nc.ok === true && nc.status === "needs_confirmation");
  check("needs_confirmation belum punya pemenuhan", !(await Q.getFulfillments(item.id)).some((f) => f.submission_id === t3.id));
  const a4 = await A.advanceSubmissionAction(t3.id);
  check("advance needs_confirmation→approved", a4.ok === true && a4.status === "approved");
  check("approved dari konfirmasi punya pemenuhan belum diterima", (await Q.getFulfillments(item.id)).find((f) => f.submission_id === t3.id)?.received === 0);
}

console.log("== Logout ==");
await A.logoutAction().catch(() => {});
check("cookie dihapus", !jar.has("cigatas_panitia"));

console.log(`\n✅ SEMUA ${passed} PEMERIKSAAN LULUS`);
