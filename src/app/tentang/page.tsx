import Link from "next/link";
import Image from "next/image";
import {
  Sparkles, HandHeart, Package, Users, ShieldCheck, Archive, Recycle, Ban,
  UserRound, ClipboardList, ArrowRight, HelpCircle, CheckCircle2, FileDown, Heart,
} from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/ui";

export const metadata = {
  title: "Tentang",
  description:
    "Peruntukan dan cara pakai Lelang Kebaikan Cigatas: papan gotong royong digital komunitas, bukan marketplace, tanpa nominal uang.",
};

const PURPOSES = [
  { icon: Package, title: "Memenuhi kebutuhan kegiatan", desc: "Daftar kebutuhan acara warga (beras, kopi, air, dll.) terpenuhi lewat bantuan anggota." },
  { icon: HandHeart, title: "Menyalurkan kesediaan membantu", desc: "Anggota cukup menawarkan bantuan barang/tenaga; panitia yang mengatur penyalurannya." },
  { icon: Users, title: "Transparansi progres", desc: "Semua warga bisa melihat item mana yang sudah terpenuhi, dalam proses, atau masih dibuka." },
  { icon: Recycle, title: "Mengelola sisa barang", desc: "Barang sisa/berlebih dicatat dan diputuskan: disimpan, dipakai lagi, ditukar, atau dijual kembali." },
  { icon: Archive, title: "Arsip kebaikan", desc: "Kegiatan yang selesai tersimpan rapi sebagai riwayat gotong royong komunitas." },
];

const STEPS = [
  "Buka link aplikasi (bisa dari WhatsApp) — tanpa instal, tanpa akun.",
  "Pilih kegiatan dan item kebutuhan yang ingin kamu bantu.",
  "Isi nama panggilan dan jumlah kesediaan (angka atau keterangan singkat).",
  "Simpan kode lacak yang muncul untuk memantau status pengajuanmu.",
  "Tunggu keputusan panitia; serahkan barang sesuai arahan panitia.",
];

const FAQ = [
  { q: "Apakah ada uang atau iuran?", a: "Tidak. Semua bantuan berbentuk barang atau kesediaan. Tidak ada nominal uang di mana pun." },
  { q: "Apakah anggota harus membuat akun?", a: "Tidak. Cukup nama panggilan + nomor WA (wajib untuk follow up). Hanya panitia yang punya login aman." },
  { q: "Siapa yang menentukan penerima & penanggung jawab?", a: "Panitia. Anggota hanya mengusulkan kesediaan; penetapan ada di panitia." },
  { q: "Bagaimana tahu bantuan saya sudah diterima?", a: "Pantau lewat kode lacak, atau lihat progres item di halaman kegiatan." },
];

export default function TentangPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4">
        {/* Hero */}
        <section className="pt-8 pb-6 text-center">
          <Image
            src="/images/logo-cigatas.webp"
            alt="Logo Lelang Kebaikan Cigatas"
            width={1420}
            height={945}
            className="mx-auto h-32 w-auto"
            priority
          />
          <span className="chip mt-4 bg-emerald-100 text-emerald-800">
            <Sparkles className="h-3 w-3" /> Tentang Aplikasi
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Apa itu Lelang Kebaikan Cigatas?
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-500">
            Papan gotong royong digital komunitas Cigatas. Tempat warga menawarkan bantuan untuk
            memenuhi kebutuhan kegiatan bersama — <b>tanpa akun, tanpa nominal uang</b>.
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-emerald-700">
            Satu Kepedulian, Banyak Kebaikan
          </p>
        </section>

        {/* Peruntukan */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-stone-400">Peruntukan</h2>
          <div className="space-y-3">
            {PURPOSES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card flex items-start gap-3 px-5 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-ink">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cara pakai */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-stone-400">Cara Pakai (Anggota)</h2>
          <ol className="card space-y-3 px-5 py-5">
            {STEPS.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-extrabold text-white">
                  {i + 1}
                </span>
                <span className="text-xs leading-relaxed text-stone-600">{s}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Dua peran */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-stone-400">Dua Peran</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="card px-5 py-4">
              <p className="flex items-center gap-2 text-sm font-extrabold text-ink">
                <UserRound className="h-4 w-4 text-emerald-600" /> Anggota
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-stone-500">
                <li className="flex gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> Tanpa akun, cukup nama panggilan</li>
                <li className="flex gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> Melihat kebutuhan & mengajukan bantuan</li>
                <li className="flex gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> Melacak status dengan kode</li>
              </ul>
            </div>
            <div className="card px-5 py-4">
              <p className="flex items-center gap-2 text-sm font-extrabold text-ink">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> Panitia
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-stone-500">
                <li className="flex gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> Login aman, kelola kegiatan</li>
                <li className="flex gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> Setujui/tolak & tetapkan penanggung jawab</li>
                <li className="flex gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> Kelola barang, sisa, & laporan</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Batasan */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-stone-400">Yang Perlu Diingat</h2>
          <div className="card space-y-2.5 px-5 py-4">
            {[
              "Bukan marketplace / jual beli. Ini papan gotong royong.",
              "Tidak ada nominal uang. Bantuan berupa barang & kesediaan.",
              "Anggota tidak menetapkan penanggung jawab sendiri; itu tugas panitia.",
              "Tidak perlu instal aplikasi — cukup buka link di browser HP.",
            ].map((t) => (
              <p key={t} className="flex items-start gap-2 text-xs leading-relaxed text-stone-600">
                <Ban className="h-3.5 w-3.5 shrink-0 text-rose-400" /> {t}
              </p>
            ))}
          </div>
        </section>

        {/* Laporan & data */}
        <section className="mb-8 grid gap-3 sm:grid-cols-2">
          <div className="card px-5 py-4">
            <p className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <FileDown className="h-4 w-4 text-emerald-600" /> Laporan
            </p>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              Panitia dapat mengunduh laporan <b>Sudah / Belum Terkumpul</b> dalam PDF atau Excel.
            </p>
          </div>
          <div className="card px-5 py-4">
            <p className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <ClipboardList className="h-4 w-4 text-emerald-600" /> Data & Privasi
            </p>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">
              Anggota cukup nama panggilan + nomor WA (wajib, untuk follow up panitia, hanya terlihat oleh panitia). Data tersimpan terpusat dan aman.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-stone-400">Pertanyaan Umum</h2>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="card px-5 py-4">
                <p className="flex items-start gap-2 text-sm font-extrabold text-ink">
                  <HelpCircle className="h-4 w-4 shrink-0 text-emerald-600" /> {q}
                </p>
                <p className="mt-1 pl-6 text-xs leading-relaxed text-stone-500">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mb-4 grid gap-2 sm:grid-cols-3">
          <Link href="/" className="btn-primary w-full">
            <Heart className="h-4 w-4" /> Lihat Kegiatan
          </Link>
          <Link href="/lacak" className="btn-secondary w-full">
            Lacak Bantuan <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/panitia" className="btn-ghost w-full">
            <ShieldCheck className="h-4 w-4" /> Panitia
          </Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
