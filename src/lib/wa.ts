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
