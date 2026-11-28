// Informasi pengajian rutin bulanan Korwil Cigatas.
// Dipakai di beranda & halaman informasi sebagai pengumuman tetap.

export const ROUTINE = {
  title: "Kajian Rutin Malam Jum'at",
  freq: "Bulanan · Malam Jumat ke-4",
  time: "19.30 WIB – selesai",
  place: "Masjid Cut Nyak Dhien, Cisaray Ciamis",
  speaker: "K.H Apip Muplih Muhajir",
  speakerRole: "Sesepuh / Pimpinan Ponpes Al-Wahidiyyah",
  hashtag: "#tongtinggalanger",
  poster: "/images/pengajian-rutin.webp",
};

/** Tanggal pelaksanaan berikutnya: Malam Jumat ke-4 (Kamis malam) bulan ini / depan. */
export function nextMalamJumatKe4(from = new Date()): Date {
  const cursor = new Date(from);
  for (let i = 0; i < 2; i++) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const offset = (4 - first.getDay() + 7) % 7; // hari Kamis pertama
    const fourth = new Date(y, m, 1 + offset + 21, 19, 30); // Kamis ke-4
    if (fourth.getTime() > from.getTime()) return fourth;
    cursor.setMonth(m + 1);
  }
  return cursor;
}

export function formatRoutineDate(d: Date): string {
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
