import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays, MapPin, PackageOpen, CalendarPlus, Megaphone, Package,
  Users, ChevronRight, SearchCheck,
} from "lucide-react";
import { PublicFooter, relativeTime } from "@/components/ui";
import { PublicHeader } from "@/components/public-header";
import { getActiveEvents } from "@/lib/queries";
import { ROUTINE, nextMalamJumatKe4, formatRoutineDate } from "@/lib/routine";
import { EventCountdown } from "@/components/event-countdown";
import { EventCarousel } from "@/components/event-carousel";
import { eventStartsAt, formatEventTime } from "@/lib/event-time";

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
  // Acara terdekat (akan datang) untuk dipin otomatis di banner hero.
  const upcoming = events
    .map((ev) => ({ ev, starts: eventStartsAt(ev) }))
    .filter((x) => x.starts && x.starts.getTime() > Date.now())
    .sort((a, b) => a.starts!.getTime() - b.starts!.getTime());
  const nearest = upcoming[0]?.ev ?? first;
  const nearestStarts = nearest ? eventStartsAt(nearest) : null;

  const menu = [
    { href: "/#kegiatan", title: "Lelang Kebaikan", desc: "Berinfaq & Berdonasi", img: "/images/gavel.webp", tile: "bg-amber-100", ic: "text-amber-600" },
    { href: "/informasi", title: "Agenda Kegiatan", desc: "Lihat Jadwal & Info", icon: CalendarDays, tile: "bg-emerald-100", ic: "text-emerald-700" },
    { href: first ? `/kegiatan/${first.slug}` : "/#kegiatan", title: "Kebutuhan Kegiatan", desc: "Lihat & Dukung", icon: Package, tile: "bg-orange-100", ic: "text-orange-500" },
    { href: "/tentang", title: "Profil", desc: "Struktur & Kontak", icon: Users, tile: "bg-emerald-100", ic: "text-emerald-700" },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
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
          <div className="relative min-h-[344px] px-4 pt-7 pb-20">
            <div className="max-w-[72%] sm:max-w-[56%]">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">CIGATAS · Korwil Cigatas</p>
              <div className="mt-1.5 flex items-start gap-2">
                <Image
                  src="/images/gavel.webp"
                  alt=""
                  width={112}
                  height={112}
                  className="mt-1 h-10 w-10 shrink-0 object-contain drop-shadow sm:h-14 sm:w-14"
                  aria-hidden
                />
                <h1 className="text-[38px] font-extrabold leading-[0.98] tracking-tight text-emerald-900 sm:text-[54px]">
                  Lelang<br /><span className="text-emerald-700">Kebaikan</span>
                </h1>
              </div>
              <p className="mt-2 text-[15px] font-bold italic text-emerald-800 sm:text-lg">Bersama dalam Kebaikan</p>
              <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/70 sm:text-[13px]">
                Dari Kita Untuk Kita — Berbagi, Menguatkan, Meraih Ridha Allah
              </p>
              <Link
                href="/tentang"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-800 to-emerald-600 px-4 py-2 text-[12px] font-extrabold text-white shadow-md shadow-emerald-800/25 transition active:scale-[0.98]"
              >
                Korwil Cigatas <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Pin otomatis: acara terdekat */}
            {nearest && (
              <Link
                href={`/kegiatan/${nearest.slug}`}
                className="absolute inset-x-4 bottom-3 flex items-center gap-3 rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-[0_8px_24px_rgba(7,91,53,0.18)] ring-1 ring-emerald-900/10 backdrop-blur transition active:scale-[0.99]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/20 text-emerald-800">
                  <CalendarPlus className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Acara Terdekat</span>
                  <span className="block truncate text-[14px] font-extrabold leading-tight text-ink">{nearest.title}</span>
                  {nearestStarts && <EventCountdown startsAt={nearestStarts.toISOString()} compact />}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-emerald-700" />
              </Link>
            )}
          </div>
        </section>

        {/* ---------- Kegiatan Mendatang (berjalan otomatis) ---------- */}
        <section id="kegiatan" className="mt-6 scroll-mt-24 px-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-ink">Kegiatan Mendatang</h2>
            <Link href="/informasi" className="inline-flex items-center gap-0.5 text-[12px] font-bold text-emerald-700">
              Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {events.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 px-4 py-7 text-center">
              <PackageOpen className="h-8 w-8 text-emerald-300" />
              <p className="text-sm font-bold text-stone-600">Belum ada kegiatan aktif</p>
              <p className="text-xs text-stone-400">Nantikan informasi kegiatan berikutnya dari panitia.</p>
            </div>
          ) : (
            <EventCarousel events={events} />
          )}
        </section>

        {/* ---------- Informasi Kegiatan ---------- */}
        <section id="informasi" className="mt-7 scroll-mt-24 px-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-ink">Informasi Kegiatan</h2>
            <Link href="/informasi" className="inline-flex items-center gap-0.5 text-[12px] font-bold text-emerald-700">
              Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Link href="/informasi" className="card flex items-center gap-3 px-3 py-3 transition hover:shadow-md">
            <span className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-2xl bg-emerald-100">
              <Megaphone className="h-8 w-8 text-emerald-700" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
                Pengumuman
                <span className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Baru
                </span>
              </p>
              <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-stone-500">
                {first
                  ? `Mari dukung kegiatan ${first.title} bersama Cigatas. Kebutuhan: barang, sembako & tenaga.`
                  : `${ROUTINE.title} — ${formatRoutineDate(nextRoutine)}, ${ROUTINE.time}.`}
              </p>
              <p className="mt-1 text-[11px] text-stone-400">
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
                  {m.img ? (
                    <Image src={m.img} alt="" width={88} height={88} className="h-8 w-8 object-contain" />
                  ) : (
                    m.icon && <m.icon className={`h-[22px] w-[22px] ${m.ic}`} strokeWidth={1.9} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-extrabold leading-tight text-ink">{m.title}</p>
                  <p className="mt-0.5 truncate text-[11px] text-stone-400">{m.desc}</p>
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
            <span className="flex-1 text-[12px] font-bold text-stone-600">
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
