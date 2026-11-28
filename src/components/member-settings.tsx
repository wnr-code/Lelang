"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserRound, Phone, Save, Trash2, SearchCheck, Megaphone, Info, Archive, ShieldCheck, ChevronRight, Check,
} from "lucide-react";
import { NotificationSettings } from "@/components/notification-settings";

export const NICKNAME_KEY = "cigatas.nickname";
export const CONTACT_KEY = "cigatas.contact";

const LINKS = [
  { href: "/lacak", title: "Lacak Bantuan Saya", desc: "Cek status dengan kode CGT-xxxxxx", icon: SearchCheck },
  { href: "/informasi", title: "Informasi & Agenda", desc: "Pengumuman dan pengajian rutin", icon: Megaphone },
  { href: "/tentang", title: "Profil, Struktur & Kontak", desc: "Tentang Korwil Cigatas", icon: Info },
  { href: "/arsip", title: "Riwayat Kegiatan", desc: "Arsip & laporan kegiatan terdahulu", icon: Archive },
  { href: "/panitia", title: "Masuk sebagai Panitia", desc: "Khusus pengurus (kata sandi)", icon: ShieldCheck },
];

export function MemberSettings() {
  const [nickname, setNickname] = useState("");
  const [contact, setContact] = useState("");
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setNickname(localStorage.getItem(NICKNAME_KEY) || "");
      setContact(localStorage.getItem(CONTACT_KEY) || "");
    } catch {}
    setReady(true);
  }, []);

  function save() {
    try {
      localStorage.setItem(NICKNAME_KEY, nickname.trim().slice(0, 80));
      localStorage.setItem(CONTACT_KEY, contact.trim().slice(0, 80));
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch {}
  }

  function clear() {
    try {
      localStorage.removeItem(NICKNAME_KEY);
      localStorage.removeItem(CONTACT_KEY);
    } catch {}
    setNickname("");
    setContact("");
  }

  return (
    <div className="space-y-5">
      <section className="card px-5 py-5">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
      <UserRound className="h-4 w-4 text-emerald-700" /> Data Diri untuk Pengajuan
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          Simpan nama panggilan & nomor WA agar formulir bantuan terisi otomatis. Data ini hanya tersimpan di HP ini
          dan tidak dipublikasikan.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label" htmlFor="set-nickname">Nama panggilan (Ikhwan/Akhwat)</label>
            <input
              id="set-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={80}
              placeholder="Nama Ikhwan/Akhwat"
              className="input"
              disabled={!ready}
            />
          </div>
          <div>
            <label className="label" htmlFor="set-contact">Nomor WhatsApp</label>
            <input
              id="set-contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              type="tel"
              inputMode="tel"
              maxLength={80}
              placeholder="mis. 0812xxxx"
              className="input"
              disabled={!ready}
            />
            <p className="mt-1 flex items-center gap-1 text-[12px] text-stone-400">
              <Phone className="h-3 w-3" /> Hanya terlihat oleh panitia untuk follow up.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={save} disabled={!ready} className="btn-primary px-4 py-2 text-xs">
              {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {saved ? "Tersimpan" : "Simpan di HP ini"}
            </button>
            <button onClick={clear} disabled={!ready} className="btn-ghost px-4 py-2 text-xs text-rose-500">
              <Trash2 className="h-3.5 w-3.5" /> Hapus data
            </button>
          </div>
        </div>
      </section>

      <NotificationSettings />

      <section className="card divide-y divide-stone-100 px-5">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center gap-3 py-3.5 transition hover:opacity-80">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <l.icon className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{l.title}</p>
              <p className="truncate text-[12px] text-stone-400">{l.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
          </Link>
        ))}
      </section>

      <section className="card px-5 py-4">
        <p className="text-xs font-extrabold text-ink">Tentang Aplikasi</p>
        <p className="mt-1 text-[12px] leading-relaxed text-stone-500">
          Lelang Kebaikan Cigatas · Korwil Cigatas. Anggota tidak perlu login atau membuat akun. Bantuan berupa barang,
          sembako, dan tenaga — bukan jual beli. Setiap pengajuan diverifikasi panitia sebelum dicatat sebagai diterima.
        </p>
      </section>
    </div>
  );
}
