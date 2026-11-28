import Link from "next/link";
import Image from "next/image";
import { Moon, Clock3, MapPin, Mic, CalendarDays, ChevronRight, Megaphone, Archive } from "lucide-react";
import { PublicHeader, PublicFooter, formatDate, relativeTime } from "@/components/ui";
import { getActiveEvents, getArchivedEvents } from "@/lib/queries";
import { ROUTINE, nextMalamJumatKe4, formatRoutineDate } from "@/lib/routine";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Informasi & Agenda Kegiatan",
  description: "Pengumuman, agenda kegiatan, dan jadwal pengajian rutin bulanan Korwil Cigatas.",
};

export default async function InformasiPage() {
  const events = await getActiveEvents();
  const archived = await getArchivedEvents();
  const nextRoutine = nextMalamJumatKe4();

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader notif={events.length} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Megaphone className="h-6 w-6" strokeWidth={1.9} />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-ink">Informasi Kegiatan</h1>
            <p className="text-xs text-stone-500">Pengumuman & agenda Korwil Cigatas.</p>
          </div>
        </div>

        {/* Pengajian rutin */}
        <section className="card overflow-hidden">
          <div className="banner-grad flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-white">
            <span className="inline-flex items-center gap-2 text-sm font-extrabold">
              <Moon className="h-4 w-4 text-gold" /> Pengajian Rutin
            </span>
            <span className="chip bg-white/20 text-white">{ROUTINE.freq}</span>
          </div>
          <div className="grid gap-4 px-5 py-5 sm:grid-cols-[200px_1fr]">
            <Image
              src={ROUTINE.poster}
              alt="Poster Kajian Rutin Malam Jum'at"
              width={800}
              height={1422}
              className="mx-auto h-auto w-full max-w-[220px] rounded-2xl ring-1 ring-emerald-900/10"
            />
            <div>
              <h2 className="text-lg font-extrabold text-ink">{ROUTINE.title}</h2>
              <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">
                <CalendarDays className="h-3.5 w-3.5" /> Berikutnya: {formatRoutineDate(nextRoutine)}
              </p>
              <ul className="mt-3 space-y-2 text-sm text-stone-600">
                <li className="flex items-start gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{ROUTINE.time}</li>
                <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{ROUTINE.place}</li>
                <li className="flex items-start gap-2">
                  <Mic className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{ROUTINE.speaker}<span className="block text-xs text-stone-400">{ROUTINE.speakerRole}</span></span>
                </li>
              </ul>
              <p className="mt-3 text-xs font-bold text-emerald-700">{ROUTINE.hashtag} · Terbuka untuk anggota Cigatas</p>
            </div>
          </div>
        </section>

        {/* Agenda kegiatan aktif */}
        <section className="mt-7">
          <h2 className="mb-3 text-[15px] font-extrabold text-ink">Agenda Kegiatan</h2>
          {events.length === 0 ? (
            <div className="card px-5 py-6 text-center text-sm text-stone-500">Belum ada kegiatan aktif saat ini.</div>
          ) : (
            <div className="space-y-2.5">
              {events.map((ev) => (
                <Link key={ev.id} href={`/kegiatan/${ev.slug}`} className="card flex items-center gap-3 px-4 py-3.5 transition hover:shadow-md">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-ink">{ev.title}</p>
                    <p className="text-[11px] text-stone-500">{formatDate(ev.event_date)}{ev.location ? ` · ${ev.location}` : ""}</p>
                    <p className="mt-0.5 text-[10px] text-stone-400">Diumumkan {relativeTime(ev.created_at)}</p>
                  </div>
                  <span className="chip shrink-0 bg-emerald-100 text-emerald-800">Aktif</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Riwayat */}
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-ink">Kegiatan Terdahulu</h2>
            <Link href="/arsip" className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-700">
              Semua arsip <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {archived.length === 0 ? (
            <div className="card px-5 py-5 text-center text-sm text-stone-500">Belum ada arsip kegiatan.</div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {archived.slice(0, 4).map((ev) => (
                <Link key={ev.id} href={`/arsip/${ev.slug}`} className="card flex items-center gap-3 px-4 py-3.5 transition hover:shadow-md">
                  <Archive className="h-4 w-4 shrink-0 text-stone-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{ev.title}</p>
                    <p className="text-[11px] text-stone-400">{formatDate(ev.event_date)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
