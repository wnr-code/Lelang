import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "cigatas_panitia";
const SESSION_DAYS = 7;

function getPassword(): string {
  return process.env.PANITIA_PASSWORD || "cigatas-berbagi";
}

function getSecret(): string {
  return process.env.SESSION_SECRET || "cigatas-dev-secret-ganti-di-production";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function verifyPassword(input: string): boolean {
  const expected = getPassword();
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function createSession(): Promise<void> {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = String(expires);
  const token = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isPanitia(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  const expires = Number(payload);
  return Number.isFinite(expires) && expires > Date.now();
}

export async function requirePanitia(): Promise<void> {
  if (!(await isPanitia())) {
    throw new Error("UNAUTHORIZED");
  }
}

export function newTrackCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) out += alphabet[bytes[i] % alphabet.length];
  return `CGT-${out}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "kegiatan";
}
