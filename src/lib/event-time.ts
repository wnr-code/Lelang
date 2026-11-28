// Waktu acara dalam WIB (UTC+7). Tanggal disimpan "YYYY-MM-DD", jam "HH:MM".
import type { EventRow } from "./types";

export const WIB_OFFSET = "+07:00";
/** Pengingat dikirim 4 jam sebelum acara dimulai. */
export const REMINDER_HOURS = 4;

/** Gabungkan tanggal + jam acara menjadi waktu absolut (WIB). */
export function eventStartsAt(ev: Pick<EventRow, "event_date" | "event_time">): Date | null {
  if (!ev.event_date) return null;
  const time = ev.event_time && /^\d{2}:\d{2}$/.test(ev.event_time) ? ev.event_time : "00:00";
  const d = new Date(`${ev.event_date}T${time}:00${WIB_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function reminderAt(startsAt: Date): Date {
  return new Date(startsAt.getTime() - REMINDER_HOURS * 3600_000);
}

/** "19.30 WIB" */
export function formatEventTime(time: string | null): string {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return "";
  return `${time.replace(":", ".")} WIB`;
}

export type Countdown = { days: number; hours: number; minutes: number; seconds: number; past: boolean };

export function countdownParts(target: Date, now = new Date()): Countdown {
  const diff = target.getTime() - now.getTime();
  const abs = Math.max(0, diff);
  return {
    days: Math.floor(abs / 86_400_000),
    hours: Math.floor((abs % 86_400_000) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000) / 60_000),
    seconds: Math.floor((abs % 60_000) / 1000),
    past: diff <= 0,
  };
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Label singkat: "3 hari lagi", "5 jam lagi", "sedang berlangsung". */
export function countdownLabel(target: Date, now = new Date()): string {
  const c = countdownParts(target, now);
  if (c.past) return "sudah dimulai";
  if (c.days > 0) return `${c.days} hari ${c.hours} jam lagi`;
  if (c.hours > 0) return `${c.hours} jam ${c.minutes} menit lagi`;
  if (c.minutes > 0) return `${c.minutes} menit lagi`;
  return "sebentar lagi";
}
