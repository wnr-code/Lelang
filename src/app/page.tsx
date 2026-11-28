import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarDays, MapPin, Heart, Sparkles, PackageOpen } from "lucide-react";
import { PublicHeader, PublicFooter, ItemStatusChip, ProgressBar, formatDate } from "@/components/ui";
import { getActiveEvents, getItemsWithStatus, getEventProgress, getArchivedEvents } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const events = await getActiveEvents();
  const archived = await getArchivedEvents();
  const eventData = await Promise.all(
    events.map(async (ev) => ({
      ev,
      items: await getItemsWithStatus(ev.id),
      progress: await getEventProgress(ev.id),
    }))
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4">
        {/* Hero */}
        <section className="pt-8 pb-6 text-center">
          <span className="chip bg-emerald-100 text-emerald-800">
            <Sparkles className="h-3 w-3" /> Papan Gotong Royong Digital
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Mari Berbagi Kebaikan{" "}
            <Heart className="inline h-7 w-7 fill-rose-500 text-rose-500 sm:h-8 sm:w-8" />
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-500">
            Bersama kita penuhi kebutuhan kegiatan Cigatas. Tanpa akun, tanpa nominal uang — cukup nama
            panggilan dan kesediaanmu.
          </p>
          <Link href="/tentang" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">
            Apa itu Lelang Kebaikan? <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>

        <div className="relative mx-auto mb-8 max-w-md overflow-hidden rounded-3xl">
          <Image
            src="/images/hero-gotong-royong.webp"
            alt="Ilustrasi warga Cigatas bergotong royong mengumpulkan kebutuhan acara"
            width={900}
            height={600}
            className="h-auto w-full"
            priority
          />
        </div>

        {/* Kegiatan saat ini */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-stone-400">Kegiatan Saat Ini</h2>
            <span className="text-xs font-semibold text-stone-400">{events.length} aktif</span>
          </div>

          {events.length === 0 && (
            <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
              <PackageOpen className="h-10 w-10 text-stone-300" />
              <p className="text-sm font-bold text-stone-600">Belum ada kegiatan aktif</p>
              <p className="max-w-xs text-xs text-stone-400">
                Panitia sedang menyiapkan kegiatan berikutnya. Cek arsip untuk melihat kebaikan yang sudah berjalan.
              </p>
              <Link href="/arsip" className="btn-secondary mt-1">Lihat Arsip Kegiatan</Link>
            </div>
          )}

          <div className="space-y-4">
            {eventData.map(({ ev, items, progress }) => {
              const preview = items.slice(0, 4);
              return (
                <Link key={ev.id} href={`/kegiatan/${ev.slug}`} className="card block overflow-hidden transition hover:shadow-md">
                  <div className="bg-emerald-600 px-5 py-4 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">Sedang Berjalan</p>
                    <h3 className="mt-1 text-lg font-extrabold">{ev.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-50">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(ev.event_date)}</span>
                      {ev.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{ev.location}</span>}
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-500">Progres pemenuhan</span>
                      <span className="font-extrabold text-emerald-700">{progress.fulfilled} dari {progress.total} item</span>
                    </div>
                    <ProgressBar value={progress.fulfilled} max={progress.total} />
                    <ul className="mt-4 divide-y divide-stone-100">
                      {preview.map((it) => (
                        <li key={it.id} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-ink">{it.name}</p>
                            <p className="text-xs text-stone-400">{it.target_label}</p>
                          </div>
                          <ItemStatusChip status={it.status} />
                        </li>
                      ))}
                    </ul>
                    {items.length > 4 && (
                      <p className="mt-1 text-xs font-semibold text-stone-400">+{items.length - 4} kebutuhan lainnya</p>
                    )}
                    <span className="btn-primary mt-4 w-full">
                      Saya Ingin Membantu <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Cara kerja */}
        <section className="mt-10">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-stone-400">Cara Berpartisipasi</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { n: "1", t: "Pilih kebutuhan", d: "Lihat daftar kebutuhan kegiatan, pilih item yang ingin kamu bantu." },
              { n: "2", t: "Ajukan kesediaan", d: "Isi nama panggilan dan jumlah kesediaan. Tanpa akun, tanpa uang." },
              { n: "3", t: "Tunggu penetapan", d: "Panitia meninjau dan menetapkan penanggung jawab. Lacak dengan kodemu." },
            ].map((s) => (
              <div key={s.n} className="card px-4 py-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-extrabold text-emerald-700">{s.n}</span>
                <p className="mt-2 text-sm font-extrabold text-ink">{s.t}</p>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Arsip singkat */}
        {archived.length > 0 && (
          <section className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-stone-400">Kebaikan Terdahulu</h2>
              <Link href="/arsip" className="text-xs font-bold text-emerald-700 hover:underline">Semua arsip →</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {archived.slice(0, 2).map((ev) => (
                <Link key={ev.id} href={`/arsip/${ev.slug}`} className="card px-4 py-4 transition hover:shadow-md">
                  <p className="text-sm font-extrabold text-ink">{ev.title}</p>
                  <p className="mt-0.5 text-xs text-stone-400">{formatDate(ev.event_date)}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-500">{ev.description}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
