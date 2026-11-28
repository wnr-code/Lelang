import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays, MapPin, PackageOpen, CalendarPlus, Megaphone, Gavel, Package,
  Users, ChevronRight, SearchCheck,
} from "lucide-react";
import { PublicHeader, PublicFooter, relativeTime } from "@/components/ui";
import { getActiveEvents } from "@/lib/queries";
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
  const nextRoutine = nextMalamJumatKe4();
  const first = events[0];

  const menu = [
    { href: "/#kegiatan", title: "Lelang Kebaikan", desc: "Berinfaq & Berdonasi", icon: Gavel, tile: "bg-amber-100", ic: "text-amber-600" },
    { href: "/informasi", title: "Agenda Kegiatan", desc: "Lihat Jadwal & Info", icon: CalendarDays, tile: "bg-emerald-100", ic: "text-emerald-700" },
    { href: first ? `/kegiatan/${first.slug}` : "/#kegiatan", title: "Kebutuhan Kegiatan", desc: "Lihat & Dukung", icon: Package, tile: "bg-orange-100", ic: "text-orange-500" },
    { href: "/tentang", title: "Profil", desc: "Struktur & Kontak", icon: Users, tile: "bg-emerald-100", ic: "text-emerald-700" },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader notif={events.length} />
      <main className="mx-auto w-full max-w-3xl flex-1">
        {/* ---------- Hero: ilustrasi masjid + daun ---------- */}
        <section className="relative overflow-hidden">
          <Image
            src="/images/hero-mosque.webp"
            alt="Ilustrasi masjid, bulan sabit, dan dedaunan hijau"
            width={1400}
            height={781}
            className="absolute inset-0 h-full w-full object-cover object-right"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 via-emerald-50/85 to-transparent sm:via-emerald-50/55" />
          <div className="relative min-h-[286px] px-4 pt-7 pb-16">
            <div className="max-w-[64%] sm:max-w-[52%]">
              <h1 className="text-[32px] font-extrabold italic leading-[1.08] tracking-tight text-emerald-900 sm:text-[40px]">
                Dari Kita<br />Untuk Kita
              </h1>
              <p className="mt-3 text-[13px] font-medium leading-relaxed text-ink/80 sm:text-sm">
                Berbagi, Menguatkan,<br />Meraih Ridha Allah
              </p>
              <Link
                href="/tentang"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-800 to-emerald-600 px-4 py-2 text-[11px] font-extrabold text-white shadow-md shadow-emerald-800/25 transition active:scale-[0.98]"
              >
                Korwil Cigatas <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- Kegiatan Mendatang ---------- */}
        <section id="kegiatan" className="relative z-10 -mt-9 scroll-mt-24 px-4">
          <div className="card animate-fade-up px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-extrabold text-ink">Kegiatan Mendatang</h2>
              <Link href="/informasi" className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-700">
                Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {events.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-emerald-50/60 px-4 py-7 text-center ring-1 ring-emerald-100">
                <PackageOpen className="h-8 w-8 text-emerald-300" />
                <p className="text-sm font-bold text-stone-600">Belum ada kegiatan aktif</p>
                <p className="text-xs text-stone-400">Nantikan informasi kegiatan berikutnya dari panitia.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {events.map((ev) => {
                  const db = dateBlock(ev.event_date);
                  return (
                    <div key={ev.id} className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5 ring-1 ring-stone-100">
                      <div className="flex w-[68px] shrink-0 flex-col items-center rounded-2xl bg-emerald-100/70 py-2">
                        <span className="text-[22px] font-extrabold leading-none text-emerald-900">{db.day}</span>
                        <span className="mt-0.5 text-[12px] font-extrabold leading-none text-emerald-900">{db.mon}</span>
                        <span className="text-[11px] font-semibold text-ink/60">{db.year}</span>
                        {db.dow && (
                          <span className="mt-1.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white">{db.dow}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-extrabold text-ink">{ev.title}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-stone-500">
                          <MapPin className="h-3 w-3 shrink-0 text-emerald-600" />
                          <span className="truncate">{ev.location || "Cigatas"}</span>
                        </p>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-stone-400">{ev.description}</p>
                      </div>
                      <Link
                        href={`/kegiatan/${ev.slug}`}
                        className="flex w-[68px] shrink-0 flex-col items-center gap-1 rounded-2xl bg-gradient-to-b from-emerald-600 to-emerald-800 px-2 py-3 text-white shadow-md shadow-emerald-800/20 transition active:scale-[0.97]"
                      >
                        <CalendarPlus className="h-5 w-5" />
                        <span className="text-center text-[10px] font-extrabold leading-tight">Ikut<br />Berinfaq</span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ---------- Informasi Kegiatan ---------- */}
        <section id="informasi" className="mt-7 scroll-mt-24 px-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-ink">Informasi Kegiatan</h2>
            <Link href="/informasi" className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-700">
              Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Link href="/informasi" className="card flex items-center gap-3 px-3 py-3 transition hover:shadow-md">
            <span className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-2xl bg-emerald-100">
              <Megaphone className="h-8 w-8 text-emerald-700" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[14px] font-extrabold text-ink">
                Pengumuman
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Baru
                </span>
              </p>
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-stone-500">
                {first
                  ? `Mari dukung kegiatan ${first.title} bersama Cigatas. Kebutuhan: barang, sembako & tenaga.`
                  : `${ROUTINE.title} — ${formatRoutineDate(nextRoutine)}, ${ROUTINE.time}.`}
              </p>
              <p className="mt-1 text-[10px] text-stone-400">
                {first ? relativeTime(first.created_at) : `${ROUTINE.place}`}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
          </Link>
        </section>

        {/* ---------- Menu Utama ---------- */}
        <section className="mt-7 px-4">
          <h2 className="mb-3 text-[15px] font-extrabold text-ink">Menu Utama</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {menu.map((m) => (
              <Link key={m.title} href={m.href} className="card flex items-center gap-2.5 px-3 py-3 transition hover:shadow-md active:scale-[0.99]">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.tile}`}>
                  <m.icon className={`h-[22px] w-[22px] ${m.ic}`} strokeWidth={1.9} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-extrabold leading-tight text-ink">{m.title}</p>
                  <p className="mt-0.5 truncate text-[10px] text-stone-400">{m.desc}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-stone-300" />
              </Link>
            ))}
          </div>
          <Link
            href="/lacak"
            className="mt-2.5 flex items-center gap-2.5 rounded-2xl bg-white/70 px-3 py-2.5 ring-1 ring-emerald-900/5 transition hover:bg-white"
          >
            <SearchCheck className="h-4 w-4 shrink-0 text-emerald-700" />
            <span className="flex-1 text-[11px] font-bold text-stone-600">
              Lacak bantuan saya <span className="font-medium text-stone-400">· kode CGT-xxxxxx</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-stone-300" />
          </Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
