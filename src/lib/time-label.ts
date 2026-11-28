/** "2 jam yang lalu" dari teks waktu UTC "YYYY-MM-DD HH:MM:SS" atau ISO. */
export function relativeTime(s: string): string {
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return s;
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 0) return "akan datang";
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hour = Math.round(min / 60);
  if (hour < 24) return `${hour} jam lalu`;
  const day = Math.round(hour / 24);
  if (day < 30) return `${day} hari lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
