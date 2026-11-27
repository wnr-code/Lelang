import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "cigatas.db");
for (const f of [dbPath, dbPath + "-wal", dbPath + "-shm"]) {
  if (fs.existsSync(f)) {
    fs.unlinkSync(f);
    console.log("Dihapus:", f);
  }
}
console.log("Database direset. Seed data ilustrasi akan dibuat ulang saat server berikutnya diakses.");
