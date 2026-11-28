/** Tautan konfirmasi WhatsApp. Bila nomor panitia disetel → langsung ke nomor itu;
 *  bila belum → buka WhatsApp dengan teks siap kirim (pilih kontak/grup panitia). */
export function waConfirmLink(panitiaWa: string, text: string): string {
  const enc = encodeURIComponent(text);
  const digits = panitiaWa.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}?text=${enc}` : `https://wa.me/?text=${enc}`;
}

/** Normalisasi nomor ke format internasional 62xxx untuk wa.me. */
export function normalizeWa(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  return d;
}

/** Tautan follow-up WhatsApp ke nomor anggota dengan pesan siap kirim. */
export function waFollowUp(contact: string, message: string): string {
  const digits = normalizeWa(contact);
  const enc = encodeURIComponent(message);
  return digits ? `https://wa.me/${digits}?text=${enc}` : `https://wa.me/?text=${enc}`;
}

/** Pesan follow-up panitia yang sopan & siap kirim (barang/tenaga/usulan). */
export function followUpMessage(opts: {
  name: string;
  itemName: string;
  qty?: string;
  eventTitle?: string;
  purpose?: "pengajuan" | "penyerahan" | "usulan";
}): string {
  const { name, itemName, qty, eventTitle, purpose = "pengajuan" } = opts;
  const sapa = `Assalamu'alaikum ${name || "Ikhwan/Akhwat"}. Kami panitia Lelang Kebaikan Cigatas.`;
  const barang = `"${itemName}"${qty ? ` (${qty})` : ""}${eventTitle ? ` untuk kegiatan ${eventTitle}` : ""}`;
  if (purpose === "penyerahan") {
    return `${sapa} Menindaklanjuti kesediaan ${barang}. Mohon konfirmasi kapan barang/tenaga bisa diserahkan agar kami catat penerimaannya. Jazakumullah khairan.`;
  }
  if (purpose === "usulan") {
    return `${sapa} Menindaklanjuti usulan item ${barang}. Kami ingin konfirmasi detailnya sebelum ditetapkan sebagai kebutuhan resmi. Terima kasih.`;
  }
  return `${sapa} Menindaklanjuti pengajuan ${barang}. Mohon konfirmasi kesediaan serta waktu penyerahannya. Jazakumullah khairan.`;
}
