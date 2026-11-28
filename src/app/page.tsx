import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays, MapPin, Heart, PackageOpen, HandHeart,
  Megaphone, Gavel, Package, Users, ChevronRight, SearchCheck,
} from "lucide-react";
import { PublicHeader, PublicFooter, formatDate } from "@/components/ui";
import { getActiveEvents, getArchivedEvents } from "@/lib/queries";
import { ROUTINE, nextMalamJumatKe4, formatRoutineDate } from "@/lib/routine";

export const dynamic = "force-dynamic";

function dateBlock(dateStr: string | null) {
  if (!dateStr) return { day: "—", mon: "", year: "", dow: "" };
  const d = new Date(dateStr + (dateStr.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return { day: "—", mon: "", year: "", dow: "" };
  return {
    day: String(d.getDate()),
    mon: d.toLocaleDateString("id-ID", { month: "short" }),
    year: String(d.getFullYear()),
    dow: d.toLocaleDateString("id-ID", { weekday: "long" }),
  };
}

export default async function HomePage() {
  const events = await getActiveEvents();
  const archived = await getArchivedEvents();
  const nextRoutine = nextMalamJumatKe4();
  const menu = [
    { href: "/#kegiatan", title: "Lelang Kebaikan", desc: "Berinfaq & Berdonasi", icon: Gavel, tone: "bg-amber-100 text-amber-700" },
    { href: "/#informasi", title: "Agenda Kegiatan", desc: "Lihat Jadwal & Info", icon: CalendarDays, tone: "bg-emerald-100 text-emerald-700" },
    { href: events[0] ? `/kegiatan/${events[0].slug}` : "/#kegiatan", title: "Kebutuhan Kegiatan", desc: "Lihat & Dukung", icon: Package, tone: "bg-orange-100 text-orange-700" },
    { href: "/tentang", title: "Profil & Kontak", desc: "Struktur & Pengurus", icon: Users, tone: "bg-emerald-100 text-emerald-700" },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader notif={events.length} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4">
        {/* Hero */}
        <section className="hero-grad -mx-4 rounded-b-[2rem] px-4 pt-6 pb-8">
          <div className="grid items-center gap-4 sm:grid-cols-2">
            <div>
              <h1 className="text-3xl font-extrabold italic leading-tight tracking-tight text-emerald-950 sm:text-4xl">
                Dari Kita<br />Untuk Kita
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-emerald-900/70">
                Berbagi, Menguatkan,<br />Meraih Ridha Allah
              </p>
              <Link href="/tentang" className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white shadow">
                Majelis Qurrotul Ain <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <Image
              src="/images/hero-android.webp"
              alt="Ilustrasi masjid dan tangan menyerahkan kotak bantuan"
              width={900}
              height={600}
              className="h-auto w-full rounded-3xl"
              priority
            />
          </div>
        </section>

        {/* Kegiatan mendatang */}
        <section id="kegiatan" className="mt-8 scroll-mt-20">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-ink">Kegiatan Mendatang</h2>
            <Link href="/arsip" className="text-xs font-bold text-emerald-700 hover:underline">Lihat Semua →</Link>
          </div>
          {events.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 px-6 py-8 text-center">
              <PackageOpen className="h-9 w-9 text-stone-300" />
              <p className="text-sm font-bold text-stone-600">Belum ada kegiatan aktif</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => {
                const db = dateBlock(ev.event_date);
                return (
                  <div key={ev.id} className="card flex items-center gap-4 px-4 py-4">
                    <div className="flex w-16 shrink-0 flex-col items-center rounded-2xl bg-emerald-50 py-2 ring-1 ring-emerald-100">
                      <span className="text-xl font-extrabold text-emerald-900">{db.day}</span>
                      <span className="text-[11px] font-extrabold uppercase text-emerald-800">{db.mon}</span>
                      <span className="text-[10px] text-stone-500">{db.year}</span>
                      <span className="mt-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white">{db.dow}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-ink">{ev.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500"><MapPin className="h-3 w-3" />{ev.location || "Cigatas"}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-stone-400">{ev.description}</p>
                    </div>
                    <Link href={`/kegiatan/${ev.slug}`} className="flex shrink-0 flex-col items-center gap-1 rounded-2xl bg-emerald-600 px-3 py-2 text-white shadow">
                      <HandHeart className="h-5 w-5" />
                      <span className="text-[10px] font-extrabold leading-tight">Ikut<br />Berinfaq</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Informasi kegiatan (pengajian rutin) */}
        <section id="informasi" className="mt-8 scroll-mt-20">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-ink">Informasi Kegiatan</h2>
            <Link href="/tentang" className="text-xs font-bold text-emerald-700 hover:underline">Lihat Semua →</Link>
          </div>
          <Link href="/tentang" className="card flex items-center gap-4 px-4 py-4 transition hover:shadow-md">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Megaphone className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-extrabold text-ink">
                Pengajian Rutin <span className="chip bg-emerald-100 text-emerald-800">Bulanan</span>
              </p>
              <p className="mt-0.5 text-xs text-stone-500">{ROUTINE.title} · {formatRoutineDate(nextRoutine)}</p>
              <p className="text-xs text-stone-400">{ROUTINE.time} · {ROUTINE.place}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
          </Link>
        </section>

        {/* Menu utama */}
        <section className="mt-8">
          <h2 className="mb-3 text-base font-extrabold text-ink">Menu Utama</h2>
          <div className="grid grid-cols-2 gap-3">
            {menu.map((m) => (
              <Link key={m.title} href={m.href} className="card flex items-center gap-3 px-4 py-4 transition hover:shadow-md">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.tone}`}>
                  <m.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-ink">{m.title}</p>
                  <p className="truncate text-[10px] text-stone-400">{m.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
              </Link>
            ))}
          </div>
        </section>

        {/* Lacak bantuan */}
        <section className="mt-6">
          <Link href="/lacak" className="card flex items-center gap-4 px-4 py-4 transition hover:shadow-md">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <SearchCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-ink">Lacak Bantuan Saya</p>
              <p className="text-[10px] text-stone-400">Punya kode CGT-xxxxxx? Cek statusnya di sini.</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
          </Link>
        </section>

        {/* Arsip singkat */}
        {archived.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-ink">Kebaikan Terdahulu</h2>
              <Link href="/arsip" className="text-xs font-bold text-emerald-700 hover:underline">Semua arsip →</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {archived.slice(0, 2).map((ev) => (
                <Link key={ev.id} href={`/arsip/${ev.slug}`} className="card px-4 py-4 transition hover:shadow-md">
                  <p className="text-sm font-extrabold text-ink">{ev.title}</p>
                  <p className="mt-0.5 text-xs text-stone-400">{formatDate(ev.event_date)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs font-bold text-emerald-700">
          <Heart className="h-4 w-4 fill-rose-500 text-rose-500" /> Satu Kepedulian, Banyak Kebaikan
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
