import { DatabaseSync, type StatementSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "cigatas.db");

let db: DatabaseSync | null = null;

// `node:sqlite` mengembalikan baris ber-prototype null. React Server Components
// menolak objek seperti itu saat dikirim ke Client Component ("Only plain objects…").
// Salin setiap baris jadi objek biasa agar halaman panitia tidak error di preview.
function plainStatement(stmt: StatementSync): StatementSync {
  const get = stmt.get.bind(stmt);
  const all = stmt.all.bind(stmt);
  stmt.get = ((...args: Parameters<StatementSync["get"]>) => {
    const row = get(...args);
    return row ? { ...row } : row;
  }) as StatementSync["get"];
  stmt.all = ((...args: Parameters<StatementSync["all"]>) =>
    all(...args).map((row) => ({ ...row }))) as StatementSync["all"];
  return stmt;
}

export function getDb(): DatabaseSync {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const raw = new DatabaseSync(DB_PATH);
  raw.exec("PRAGMA journal_mode = WAL;");
  raw.exec("PRAGMA foreign_keys = ON;");
  migrate(raw);
  const prepare = raw.prepare.bind(raw);
  raw.prepare = ((sql: string) => plainStatement(prepare(sql))) as DatabaseSync["prepare"];
  db = raw;
  return db;
}

const SCHEMA_VERSION = 2;

function submissionsDDL(name: string): string {
  return `CREATE TABLE IF NOT EXISTS ${name} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    qty REAL,
    qty_label TEXT NOT NULL DEFAULT '',
    unit TEXT NOT NULL DEFAULT '',
    availability TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    contact TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','needs_confirmation','rejected','done')),
    track_code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    decided_at TEXT,
    decision_note TEXT NOT NULL DEFAULT ''
  );`;
}

function surplusDDL(name: string): string {
  return `CREATE TABLE IF NOT EXISTS ${name} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    qty REAL,
    qty_label TEXT NOT NULL DEFAULT '',
    condition TEXT NOT NULL DEFAULT 'sisa' CHECK (condition IN ('sisa','berlebih')),
    decision TEXT NOT NULL DEFAULT 'disimpan' CHECK (decision IN ('disimpan','kegiatan_berikutnya','ditukar','dijual','disalurkan','didonasikan','lainnya')),
    decision_note TEXT NOT NULL DEFAULT '',
    pic_name TEXT NOT NULL DEFAULT '',
    outcome TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT
  );`;
}

function tableColumns(db: DatabaseSync, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as unknown as Array<{ name: string }>;
  return new Set(rows.map((r) => r.name));
}

function addColumn(db: DatabaseSync, table: string, name: string, ddl: string) {
  if (!tableColumns(db, table).has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
}

/** Bangun ulang tabel lama agar CHECK status/decision yang baru ikut berlaku. */
function rebuild(db: DatabaseSync, table: string, ddl: (n: string) => string, marker: string) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(table) as
    | { sql: string }
    | undefined;
  if (!row || row.sql.includes(marker)) return;
  const cols = [...tableColumns(db, table)].join(", ");
  db.exec("PRAGMA foreign_keys=OFF");
  db.exec(ddl(`${table}_new`));
  db.exec(`INSERT INTO ${table}_new (${cols}) SELECT ${cols} FROM ${table}`);
  db.exec(`DROP TABLE ${table}`);
  db.exec(`ALTER TABLE ${table}_new RENAME TO ${table}`);
  db.exec("PRAGMA foreign_keys=ON");
}

/** Migrasi berkas SQLite lama (preview lokal) ke skema barang/tenaga + status baru. */
function upgrade(db: DatabaseSync) {
  const v = (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
  if (v >= SCHEMA_VERSION) return;
  addColumn(db, "items", "kind", "TEXT NOT NULL DEFAULT 'barang'");
  addColumn(db, "submissions", "unit", "TEXT NOT NULL DEFAULT ''");
  addColumn(db, "submissions", "availability", "TEXT NOT NULL DEFAULT ''");
  addColumn(db, "fulfillments", "received_at", "TEXT");
  rebuild(db, "submissions", submissionsDDL, "needs_confirmation");
  rebuild(db, "surplus", surplusDDL, "disalurkan");
  db.exec("CREATE INDEX IF NOT EXISTS idx_submissions_event ON submissions(event_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_submissions_item ON submissions(item_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_surplus_event ON surplus(event_id)");
  db.exec("UPDATE fulfillments SET received_at = created_at WHERE received = 1 AND received_at IS NULL");
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

function migrate(db: DatabaseSync) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    event_date TEXT,
    location TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed','archived')),
    cover_image TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'barang' CHECK (kind IN ('barang','tenaga')),
    name TEXT NOT NULL,
    target_qty REAL,
    target_label TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_open INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  ${submissionsDDL("submissions")}

  CREATE TABLE IF NOT EXISTS fulfillments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    submission_id INTEGER REFERENCES submissions(id) ON DELETE SET NULL,
    person_name TEXT NOT NULL,
    qty REAL,
    qty_label TEXT NOT NULL DEFAULT '',
    is_pic INTEGER NOT NULL DEFAULT 0,
    received INTEGER NOT NULL DEFAULT 0,
    received_at TEXT,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  ${surplusDDL("surplus")}

  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_items_event ON items(event_id);
  CREATE INDEX IF NOT EXISTS idx_submissions_event ON submissions(event_id);
  CREATE INDEX IF NOT EXISTS idx_submissions_item ON submissions(item_id);
  CREATE INDEX IF NOT EXISTS idx_fulfillments_item ON fulfillments(item_id);
  CREATE INDEX IF NOT EXISTS idx_surplus_event ON surplus(event_id);
  CREATE INDEX IF NOT EXISTS idx_photos_event ON photos(event_id);
  `);

  upgrade(db);

  const count = db.prepare("SELECT COUNT(*) AS c FROM events").get() as { c: number };
  if (count.c === 0) seed(db);
}

function seed(db: DatabaseSync) {
  const insEvent = db.prepare(
    `INSERT INTO events (slug,title,description,event_date,location,status,cover_image,completed_at)
     VALUES (?,?,?,?,?,?,?,?)`
  );
  const insItem = db.prepare(
    `INSERT INTO items (event_id,name,target_qty,target_label,unit,note,sort_order,is_open,kind) VALUES (?,?,?,?,?,?,?,?,?)`
  );
  const insSub = db.prepare(
    `INSERT INTO submissions (event_id,item_id,nickname,qty,qty_label,message,contact,status,track_code,decided_at,decision_note)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  );
  const insFul = db.prepare(
    `INSERT INTO fulfillments (item_id,submission_id,person_name,qty,qty_label,is_pic,received,note) VALUES (?,?,?,?,?,?,?,?)`
  );
  const insSurplus = db.prepare(
    `INSERT INTO surplus (event_id,item_id,item_name,qty,qty_label,condition,decision,decision_note,pic_name,outcome,resolved_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  );
  const insPhoto = db.prepare(
    `INSERT INTO photos (event_id,file_path,caption) VALUES (?,?,?)`
  );

  // ---- Kegiatan aktif: Persiapan Acara Cigatas ----
  const active = insEvent.run(
    "persiapan-acara-cigatas",
    "Persiapan Acara Cigatas",
    "Bersama kita penuhi kebutuhan acara komunitas Cigatas. Pilih item yang ingin kamu bantu — sekecil apa pun, sangat berarti.",
    nextSunday(),
    "Balai Warga Cigatas",
    "active",
    null,
    null
  );
  const eid = Number(active.lastInsertRowid);

  const items: Array<[string, number | null, string, string, string, number]> = [
    ["Beras", 40, "40 Kg", "Kg", "Untuk konsumsi bersama saat acara.", 0],
    ["Kopi Campur", 8, "8 Dus", "Dus", "Sajian hangat untuk warga yang hadir.", 1],
    ["Air Mineral", null, "Secukupnya", "", "Botol atau gelas, sesuai kesediaan.", 2],
    ["Gula Pasir", 6, "6 Kg", "Kg", "Pendamping kopi dan teh.", 3],
    ["Mie Instan", 5, "5 Dus", "Dus", "Cadangan konsumsi panitia.", 4],
    ["Snack Anak", 60, "60 Bungkus", "Bungkus", "Untuk adik-adik yang ikut hadir.", 5],
    ["Kantong Plastik", null, "Secukupnya", "", "Membantu pembagian barang.", 6],
    ["Kebutuhan Lainnya", null, "Sesuai arahan panitia", "", "Terbuka untuk bantuan lain yang bermanfaat.", 7],
  ];
  const itemIds: number[] = [];
  for (const [name, qty, label, unit, note, order] of items) {
    itemIds.push(Number(insItem.run(eid, name, qty, label, unit, note, order, 1, "barang").lastInsertRowid));
  }

  // Kebutuhan tenaga (bantuan non-barang) untuk kegiatan aktif.
  const tenaga: Array<[string, number | null, string, string, string, number]> = [
    ["Tenaga Masak (Dapur Umum)", 6, "6 Orang", "Orang", "Membantu memasak konsumsi untuk tamu.", 90],
    ["Tenaga Bongkar & Angkut", 4, "4 Orang", "Orang", "Menyiapkan dan menata barang di lokasi.", 91],
    ["Tenaga Kebersihan", 3, "3 Orang", "Orang", "Merapikan lokasi sebelum dan sesudah acara.", 92],
  ];
  const tenagaIds: number[] = [];
  for (const [name, qty, label, unit, note, order] of tenaga) {
    tenagaIds.push(Number(insItem.run(eid, name, qty, label, unit, note, order, 1, "tenaga").lastInsertRowid));
  }
  db.prepare(
    `INSERT INTO submissions (event_id,item_id,nickname,qty,qty_label,unit,availability,message,contact,status,track_code)
     VALUES (?,?,?,?,?,?,?,?,?,'pending',?)`
  ).run(eid, tenagaIds[0], "Mas Ridwan", 1, "1 Orang", "Orang", "Sabtu, 07.00–12.00 WIB", "Siap bantu masak dari pagi.", "", "CGT-TENAGA-01");

  // Beras & Kopi sudah terpenuhi
  const s1 = insSub.run(eid, itemIds[0], "Kang Asep", 40, "40 Kg", "Beras dari rumah, siap diantar Sabtu.", "", "approved", "CGT-BERAS-01", now(), "Silakan antar ke balai warga, terima kasih!").lastInsertRowid;
  insFul.run(itemIds[0], Number(s1), "Kang Asep", 40, "40 Kg", 1, 1, "Diterima penuh, dititipkan di gudang balai.");
  const s2 = insSub.run(eid, itemIds[1], "Teh Nisa", 8, "8 Dus", "Kopi campur dari warung saya.", "", "approved", "CGT-KOPI-01", now(), "Ditunggu di balai warga ya.").lastInsertRowid;
  insFul.run(itemIds[1], Number(s2), "Teh Nisa", 8, "8 Dus", 1, 1, "Diterima penuh.");

  // Air mineral dalam proses
  const s3 = insSub.run(eid, itemIds[2], "Mang Ujang", 2, "2 Dus", "Saya sanggup 2 dus air mineral.", "", "approved", "CGT-AIR-01", now(), "Terima kasih, sisanya kita cari bersama.").lastInsertRowid;
  insFul.run(itemIds[2], Number(s3), "Mang Ujang", 2, "2 Dus", 1, 0, "Belum diantar, dijadwalkan Jumat.");
  insSub.run(eid, itemIds[2], "Bu Ratna", 1, "1 Dus", "Menyusul 1 dus kalau masih kurang.", "", "pending", "CGT-AIR-02", null, "");

  // Gula & Mie terpenuhi
  const s4 = insSub.run(eid, itemIds[3], "Pak Haji Dedi", 6, "6 Kg", "Gula pasir 6 kg dari saya.", "", "approved", "CGT-GULA-01", now(), "Matur nuwun.").lastInsertRowid;
  insFul.run(itemIds[3], Number(s4), "Pak Haji Dedi", 6, "6 Kg", 1, 1, "Diterima.");
  const s5 = insSub.run(eid, itemIds[4], "Mas Budi", 5, "5 Dus", "Mie instan 5 dus, siap.", "", "approved", "CGT-MIE-01", now(), "Siap, ditunggu.").lastInsertRowid;
  insFul.run(itemIds[4], Number(s5), "Mas Budi", 5, "5 Dus", 1, 1, "Diterima.");

  // Snack & lainnya masih dibuka
  insSub.run(eid, itemIds[5], "Teh Sari", 20, "20 Bungkus", "Snack untuk 20 anak dari saya.", "", "pending", "CGT-SNACK-01", null, "");

  // ---- Kegiatan selesai (arsip): Halal Bihalal Cigatas ----
  const past = insEvent.run(
    "halal-bihalal-cigatas-2025",
    "Halal Bihalal Cigatas",
    "Silaturahmi warga Cigatas setelah Idulfitri. Alhamdulillah berjalan lancar berkat gotong royong semua anggota.",
    "2025-04-13",
    "Halaman Masjid Cigatas",
    "archived",
    null,
    "2025-04-14 10:00:00"
  );
  const pid = Number(past.lastInsertRowid);
  const pItems: Array<[string, number | null, string, string]> = [
    ["Beras", 30, "30 Kg", "Kg"],
    ["Kopi", 6, "6 Dus", "Dus"],
    ["Air Mineral", 10, "10 Dus", "Dus"],
    ["Kue Kering", 25, "25 Toples", "Toples"],
  ];
  const pItemIds: number[] = [];
  for (let i = 0; i < pItems.length; i++) {
    const [name, qty, label, unit] = pItems[i];
    pItemIds.push(Number(insItem.run(pid, name, qty, label, unit, "", i, 0, "barang").lastInsertRowid));
  }
  const ps1 = insSub.run(pid, pItemIds[0], "Kang Asep", 32, "32 Kg", "Beras lebih dari target, tidak apa-apa.", "", "approved", "CGT-HB-BERAS", "2025-04-10 09:00:00", "Alhamdulillah, terima kasih.").lastInsertRowid;
  insFul.run(pItemIds[0], Number(ps1), "Kang Asep", 32, "32 Kg", 1, 1, "Diterima penuh.");
  const ps2 = insSub.run(pid, pItemIds[1], "Teh Nisa", 7, "7 Dus", "Kopi 7 dus.", "", "approved", "CGT-HB-KOPI", "2025-04-10 09:10:00", "Terima kasih.").lastInsertRowid;
  insFul.run(pItemIds[1], Number(ps2), "Teh Nisa", 7, "7 Dus", 1, 1, "Diterima.");
  const ps3 = insSub.run(pid, pItemIds[2], "Mang Ujang", 10, "10 Dus", "Air mineral 10 dus.", "", "approved", "CGT-HB-AIR", "2025-04-11 08:00:00", "Siap.").lastInsertRowid;
  insFul.run(pItemIds[2], Number(ps3), "Mang Ujang", 10, "10 Dus", 1, 1, "Diterima.");
  const ps4 = insSub.run(pid, pItemIds[3], "Bu Ratna", 25, "25 Toples", "Kue kering buatan sendiri.", "", "approved", "CGT-HB-KUE", "2025-04-11 10:00:00", "Masyaallah, terima kasih.").lastInsertRowid;
  insFul.run(pItemIds[3], Number(ps4), "Bu Ratna", 25, "25 Toples", 1, 1, "Diterima.");

  insSurplus.run(pid, pItemIds[0], "Beras", 2, "2 Kg", "sisa", "disimpan", "Sisa konsumsi, masih layak.", "Panitia Gudang", "Disimpan di gudang balai warga untuk kegiatan berikutnya.", "2025-04-14 10:00:00");
  insSurplus.run(pid, pItemIds[1], "Kopi", 1, "1 Dus", "sisa", "kegiatan_berikutnya", "Masih tersegel.", "Teh Nisa", "Dialokasikan untuk pengajian bulan depan.", "2025-04-14 10:00:00");
  insSurplus.run(pid, pItemIds[2], "Air Mineral", 2, "2 Dus", "sisa", "ditukar", "Ditukar dengan gula pasir di warung.", "Mang Ujang", "Ditukar 2 dus air dengan 3 kg gula pasir.", "2025-04-14 10:00:00");
  insSurplus.run(pid, pItemIds[3], "Kue Kering", 3, "3 Toples", "berlebih", "didonasikan", "Masih layak konsumsi.", "Bu Ratna", "Didonasikan ke panti asuhan Al-Ikhlas.", "2025-04-14 10:00:00");

  // Tanggal penerimaan diisi untuk barang yang sudah diterima.
  db.exec("UPDATE fulfillments SET received_at = created_at WHERE received = 1 AND received_at IS NULL");

  insPhoto.run(pid, "/images/arsip-1.webp", "Silaturahmi warga saat halal bihalal.");
  insPhoto.run(pid, "/images/arsip-2.webp", "Hasil gotong royong kebutuhan acara.");
}

function nextSunday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (7 - day) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export function resetDb() {
  if (db) {
    db.close();
    db = null;
  }
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  for (const suffix of ["-wal", "-shm"]) {
    const p = DB_PATH + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}
