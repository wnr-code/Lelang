// Render mockup UI/UX ke PNG (tanpa browser) memakai SVG + sharp.
// Jalankan: node scripts/render-mockup.mjs
import sharp from "sharp";

const BG = "#FAF5EC", SUR = "#FFFFFF", INK = "#2A2620", MUT = "#8A8177",
  PRI = "#0B7A55", PRIS = "#E5F2EC", ACC = "#E9A23B", ACCS = "#FBF0DC",
  LINE = "#EFE7DA", SKY = "#E3F0F7", SKYT = "#20647E", ROSE = "#FBE7EC", ROSET = "#B03A5B";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
let out = "";
const rect = (x, y, w, h, rx, fill, stroke) => { out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${stroke ? ` stroke="${stroke}"` : ""}/>`; };
const txt = (x, y, size, weight, fill, s, anchor = "start") => { out += `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`; };
const chip = (x, y, label, bg, fg) => { const w = label.length * 6.2 + 22; rect(x, y, w, 22, 999, bg); txt(x + w / 2, y + 15, 10.5, 800, fg, label, "middle"); return w; };
const card = (x, y, w, h) => rect(x, y, w, h, 20, SUR, LINE);
const btn = (x, y, w, h, label, bg, fg) => { rect(x, y, w, h, 14, bg); txt(x + w / 2, y + h / 2 + 4, 12.5, 800, fg, label, "middle"); };
const bar = (x, y, w, pct) => { rect(x, y, w, 8, 999, "#F0E9DD"); rect(x, y, w * pct, 8, 999, PRI); };
const need = (x, y, w, label, st, bg, fg) => { txt(x, y + 14, 12, 600, INK, label); const cw = st.length * 6.2 + 20; chip(x + w - cw, y, st, bg, fg); };

function phone(px, py, title, small, body) {
  rect(px, py, 380, 800, 40, "#1d1a16");
  rect(px + 10, py + 10, 360, 780, 32, BG);
  rect(px + 150, py + 20, 80, 8, 999, "#1d1a16");
  const x = px + 26, w = 328;
  // topbar
  rect(x, py + 44, 36, 36, 12, PRI); txt(x + 18, py + 68, 16, 800, "#fff", "🤝", "middle");
  txt(x + 46, py + 60, 14, 800, INK, title); txt(x + 46, py + 75, 10, 600, MUT, small);
  let y = py + 100;
  y = body(x, y, w);
  // bottom nav
  rect(px + 10, py + 740, 360, 50, 0, "#FFFFFF");
  const nav = ["Beranda", "Kegiatan", "Tentang", "Kontak"];
  nav.forEach((n, i) => { txt(px + 10 + 45 + i * 90, py + 770, 10, 700, i === 0 ? PRI : MUT, n, "middle"); });
}

// ---- Phone 1: Beranda ----
phone(60, 130, "Cigatas", "Majelis Qurrotul Ain", (x, y, w) => {
  chip(x + w / 2 - 70, y, "Koordinator Cigatas", PRIS, PRI); y += 34;
  txt(x + w / 2, y + 8, 21, 800, INK, "Mari Berbagi Kebaikan", "middle"); y += 30;
  txt(x + w / 2, y + 6, 11.5, 500, MUT, "Dari kita, untuk kita.", "middle"); y += 26;
  card(x, y, w, 300); let cy = y + 16;
  chip(x + 16, cy, "Akan Datang", ACCS, "#9A6A1F"); cy += 32;
  txt(x + 16, cy + 6, 16, 800, INK, "Liqo Akbar"); cy += 22;
  txt(x + 16, cy + 6, 10.5, 500, MUT, "23 Des 2026 · Masjid Qurrotul Ain"); cy += 20;
  bar(x + 16, cy, w - 32, 0.55); cy += 16;
  txt(x + 16, cy + 6, 11, 700, PRI, "5 dari 9 item terpenuhi"); cy += 20;
  need(x + 16, cy, w - 32, "Beras 40 Kg", "Terpenuhi", PRIS, PRI); cy += 28;
  need(x + 16, cy, w - 32, "Sembako & bumbu", "Proses", ACCS, "#9A6A1F"); cy += 28;
  need(x + 16, cy, w - 32, "Perlengkapan dapur", "Dibuka", SKY, SKYT); cy += 30;
  btn(x + 16, cy, w - 32, 40, "Saya Ingin Membantu", PRI, "#fff"); cy += 48;
  btn(x + 16, cy, w - 32, 40, "Infaq untuk Kegiatan", ACC, "#3E2B07");
  return y + 316;
});

// ---- Phone 2: Tentang & Kontak ----
phone(530, 130, "Tentang & Struktur", "Majelis Qurrotul Ain", (x, y, w) => {
  card(x, y, w, 96); let cy = y + 16;
  txt(x + 16, cy + 6, 12, 800, INK, "Majelis Qurrotul Ain"); txt(x + 150, cy + 6, 12, 800, ACC, "›"); txt(x + 165, cy + 6, 12, 800, PRI, "Koord. Cigatas"); cy += 24;
  txt(x + 16, cy + 6, 10.5, 500, MUT, "Pengajian & kegiatan bersama. Anggota grup WA"); cy += 15;
  txt(x + 16, cy + 6, 10.5, 500, MUT, "dapat memantau & berinfaq — amaliah bersama."); cy += 20;
  y += 112;
  txt(x, y, 10, 800, MUT, "STRUKTUR KOORDINATOR"); y += 14;
  card(x, y, w, 168); cy = y + 14;
  for (const [r, n] of [["Ketua", "(nama ketua)"], ["Sekretaris", "(nama)"], ["Bendahara", "(nama)"], ["Koord. Dapur", "(nama)"], ["Koord. Acara", "(nama)"]]) {
    txt(x + 16, cy + 8, 12, 700, INK, r); txt(x + w - 16, cy + 8, 11, 500, MUT, n, "end"); cy += 30;
  }
  y += 184;
  txt(x, y, 10, 800, MUT, "KONTAK PANITIA / PENGURUS"); y += 14;
  card(x, y, w, 148); cy = y + 14;
  for (const k of ["Ketua Cigatas · WhatsApp", "Panitia Liqo Akbar · WhatsApp", "Bendahara · WhatsApp"]) {
    rect(x + 16, cy, w - 32, 36, 12, PRIS); rect(x + 24, cy + 6, 24, 24, 8, PRI); txt(x + 36, cy + 22, 12, 800, "#fff", "✆", "middle");
    txt(x + 58, cy + 22, 11.5, 700, PRI, k); cy += 44;
  }
  return y + 160;
});

// ---- Phone 3: Kegiatan / Infaq ----
phone(1000, 130, "Liqo Akbar", "23 Desember 2026", (x, y, w) => {
  card(x, y, w, 140); let cy = y + 14;
  txt(x + 16, cy + 6, 13, 800, INK, "Kebutuhan Kegiatan"); cy += 22;
  need(x + 16, cy, w - 32, "Beras 40 Kg", "Terpenuhi", PRIS, PRI); cy += 28;
  need(x + 16, cy, w - 32, "Sembako & bumbu", "Proses", ACCS, "#9A6A1F"); cy += 28;
  need(x + 16, cy, w - 32, "Perlengkapan dapur", "Dibuka", SKY, SKYT); cy += 28;
  y += 156;
  txt(x, y, 10, 800, MUT, "PILIH BENTUK BANTUAN"); y += 14;
  card(x, y, w, 236); cy = y + 14;
  const tw = (w - 32 - 12) / 3;
  btn(x + 16, cy, tw, 30, "Barang", SUR, MUT); btn(x + 16 + tw + 6, cy, tw, 30, "Tenaga", SUR, MUT); btn(x + 16 + 2 * (tw + 6), cy, tw, 30, "Infaq Dana", PRI, "#fff"); cy += 40;
  txt(x + 16, cy + 4, 10.5, 500, MUT, "Infaq dana dibelikan sembako oleh panitia."); cy += 20;
  txt(x + 16, cy + 4, 10.5, 700, MUT, "Nama panggilan"); cy += 12; rect(x + 16, cy, w - 32, 32, 10, SUR, LINE); txt(x + 26, cy + 20, 11, 500, MUT, "mis. Kang Asep"); cy += 42;
  txt(x + 16, cy + 4, 10.5, 700, MUT, "Kesediaan / jumlah"); cy += 12; rect(x + 16, cy, w - 32, 32, 10, SUR, LINE); txt(x + 26, cy + 20, 11, 500, MUT, "mis. 5 Kg / secukupnya"); cy += 42;
  btn(x + 16, cy, w - 32, 38, "Kirim & Dapatkan Kode Lacak", PRI, "#fff");
  y += 252;
  card(x, y, w, 92); cy = y + 16;
  txt(x + 16, cy + 4, 13, 800, INK, "Upload Foto Dokumentasi"); cy += 20;
  txt(x + 16, cy + 4, 10.5, 500, MUT, "Maks 2 MB · dikompres otomatis."); cy += 18;
  btn(x + 16, cy, w - 32, 32, "Pilih Foto (≤2 MB)", SUR, INK);
  return y + 104;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="980" viewBox="0 0 1440 980">
<rect width="1440" height="980" fill="${BG}"/>
<text x="720" y="52" font-family="sans-serif" font-size="26" font-weight="800" fill="${INK}" text-anchor="middle">Mockup UI/UX — Lelang Kebaikan Cigatas</text>
<text x="720" y="80" font-family="sans-serif" font-size="13" fill="${MUT}" text-anchor="middle">Hangat · Modern · Simple — Koordinator Cigatas, Majelis Qurrotul Ain (belum live)</text>
${out}
<text x="720" y="962" font-family="sans-serif" font-size="12" fill="${MUT}" text-anchor="middle">Infaq dana dikelola panitia menjadi sembako · nominal tidak dipublikasikan · kontak pengurus via WhatsApp</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile("public/mockup.png");
console.log("mockup.png rendered");
