import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, CalendarDays, MapPin, Heart, Sparkles, PackageOpen, HandHeart,
  ShieldCheck, Users, Wheat, Coffee, Droplets, Gift, Package,
} from "lucide-react";
import { PublicHeader, PublicFooter, ItemStatusChip, ProgressBar, formatDate } from "@/components/ui";
import { getActiveEvents, getItemsWithStatus, getEventProgress, getArchivedEvents } from "@/lib/queries";
import type { ItemWithStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function itemIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("beras") || n.includes("nasi")) return Wheat;
  if (n.includes("kopi") || n.includes("teh") || n.includes("minum")) return Coffee;
  if (n.includes("air")) return Droplets;
  if (n.includes("lain") || n.includes("gift") || n.includes("snack")) return Gift;
  return Package;
}

const TRUST = [
  { icon: Users, t: "Gotong Royong", d: "dalam Kebaikan" },
  { icon: ShieldCheck, t: "Transparan", d: "dan Terpercaya" },
  { icon: Heart, t: "Untuk Kegiatan", d: "yang Lebih Bermakna" },
];

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
        {/* Hero ala Android */}
        <section className="hero-grad -mx-4 rounded-b-[2rem] px-4 pt-6 pb-8">
          <div className="grid items-center gap-4 sm:grid-cols-2">
            <div>
              <span className="chip bg-emerald-600 text-white">
                <Sparkles className="h-3 w-3" /> Koordinator Cigatas
              </span>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-emerald-950 sm:text-4xl">
                Mari Berbagi Kebaikan <Heart className="inline h-7 w-7 fill-emerald-600 text-emerald-600" />
              </h1>
              <p className="mt-3 text-sm italic leading-relaxed text-emerald-900/70">
                “Karena Berbagi adalah Ibadah dalam Ridha Allah”
              </p>
              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white shadow">
                <HandHeart className="h-4 w-4" /> Tong Tinggal Anger
              </span>
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
          <div className="mt-6 grid grid-cols-3 gap-2 rounded-3xl bg-emerald-100/70 p-3 ring-1 ring-emerald-900/5">
            {TRUST.map(({ icon: Icon, t, d }) => (
              <div key={t} className="flex flex-col items-center gap-1 text-center">
                <Icon className="h-5 w-5 text-emerald-700" />
                <p className="text-[11px] font-extrabold leading-tight text-emerald-950">{t}</p>
                <p className="text-[10px] leading-tight text-emerald-900/60">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Kegiatan saat ini */}
        <section id="kegiatan" className="mt-8 scroll-mt-20">
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white shadow">
              <CalendarDays className="h-4 w-4" /> Kegiatan Saat Ini
            </span>
            <span className="chip bg-emerald-100 text-emerald-800">{events.length} berlangsung</span>
          </div>

          {events.length === 0 && (
            <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
              <PackageOpen className="h-10 w-10 text-stone-300" />
              <p className="text-sm font-bold text-stone-600">Belum ada kegiatan aktif</p>
              <p className="max-w-xs text-xs text-stone-400">Panitia sedang menyiapkan kegiatan berikutnya.</p>
              <Link href="/arsip" className="btn-secondary mt-1">Lihat Arsip Kegiatan</Link>
            </div>
          )}

          <div className="space-y-4">
            {eventData.map(({ ev, items, progress }) => (
              <Link key={ev.id} href={`/kegiatan/${ev.slug}`} className="card block overflow-hidden transition hover:shadow-md">
                <div className="flex items-start gap-4 px-5 py-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <CalendarDays className="h-7 w-7" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-extrabold text-ink">{ev.title}</h3>
                    <p className="mt-0.5 text-xs text-stone-500">Mari penuhi kebutuhan bersama.</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-400">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(ev.event_date)}</span>
                      {ev.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.location}</span>}
                    </div>
                  </div>
                </div>
                <div className="px-5 pb-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-500">Progres pemenuhan</span>
                    <span className="font-extrabold text-emerald-700">{progress.fulfilled} dari {progress.total} item</span>
                  </div>
                  <ProgressBar value={progress.fulfilled} max={progress.total} />
                </div>
                <div className="border-t border-stone-100 px-5 py-3">
                  <ul className="divide-y divide-stone-100">
                    {items.slice(0, 4).map((it: ItemWithStatus) => {
                      const Icon = itemIcon(it.name);
                      return (
                        <li key={it.id} className="flex items-center gap-3 py-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Icon className="h-4.5 w-4.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-ink">{it.name}</p>
                            <p className="text-xs text-stone-400">{it.target_label}</p>
                          </div>
                          <ItemStatusChip status={it.status} />
                        </li>
                      );
                    })}
                  </ul>
                  {items.length > 4 && <p className="mt-1 text-xs font-semibold text-stone-400">+{items.length - 4} kebutuhan lainnya</p>}
                  <span className="btn-primary mt-3 w-full">
                    <HandHeart className="h-4 w-4" /> Saya Ingin Membantu <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Cara kerja */}
        <section className="mt-10">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-stone-400">Cara Berpartisipasi</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { n: "1", t: "Pilih kebutuhan", d: "Lihat daftar kebutuhan kegiatan, pilih item yang ingin kamu bantu." },
              { n: "2", t: "Ajukan kesediaan", d: "Isi nama panggilan, jumlah, dan nomor WA (wajib) untuk follow up panitia." },
              { n: "3", t: "Tunggu penetapan", d: "Panitia meninjau dan menetapkan penanggung jawab. Lacak dengan kodemu." },
            ].map((s) => (
              <div key={s.n} className="card px-4 py-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-extrabold text-white">{s.n}</span>
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
