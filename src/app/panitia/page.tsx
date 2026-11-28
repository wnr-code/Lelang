import Link from "next/link";
import Image from "next/image";
import type { ComponentType } from "react";
import { redirect } from "next/navigation";
import {
  Users, Package, PackageCheck, TrendingUp, CalendarDays, MapPin, ChevronRight,
  Lightbulb, Megaphone, CalendarPlus,
} from "lucide-react";
import { isPanitia } from "@/lib/auth";
import {
  getDashboardCounts, getActiveEvents, getAllEvents, getSubmissions, getProposals,
  getItemsWithStatus, getFulfillmentsForEvent,
} from "@/lib/queries";
import { Avatar, SubmissionStatusChip, ProposalStatusChip, relativeTime, formatDate } from "@/components/ui";
import { ProgressStepper } from "@/components/progress-stepper";
import { formatEventTime } from "@/lib/event-time";

export const dynamic = "force-dynamic";

type RecentCard = {
  key: string;
  type: "submission" | "proposal";
  name: string;
  nickname: string;
  qty: string;
  status: string;
  created_at: string;
  event_id: number;
};

function ts(s: string): number {
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export default async function PanitiaDashboard() {
  if (!(await isPanitia())) redirect("/panitia/login");

  const counts = await getDashboardCounts();
  const active = await getActiveEvents();
  const event = active[0] ?? (await getAllEvents())[0];

  const allSubs = await getSubmissions(undefined, "all");
  const pendingProps = await getProposals(undefined, "pending");

  let items: Awaited<ReturnType<typeof getItemsWithStatus>> = [];
  let fuls: Awaited<ReturnType<typeof getFulfillmentsForEvent>> = [];
  if (event) {
    [items, fuls] = await Promise.all([getItemsWithStatus(event.id), getFulfillmentsForEvent(event.id)]);
  }

  const totalItems = items.length;
  const fulfilled = items.filter((i) => i.status === "fulfilled").length;
  const percent = totalItems ? Math.round((fulfilled / totalItems) * 100) : 0;
  const receivedCount = fuls.filter((f) => f.received === 1).length;
  const eventSubs = event ? allSubs.filter((s) => s.event_id === event.id) : [];

  // Stepper progres kegiatan keseluruhan (bukan persetujuan per anggota).
  const stagesDone = [
    !!event && event.status !== "draft",
    totalItems > 0,
    eventSubs.length > 0,
    receivedCount > 0,
    !!event && (event.status === "completed" || event.status === "archived"),
  ];
  let current = stagesDone.findIndex((d) => !d);
  if (current === -1) current = 5;

  // Kartu pengajuan terbaru: gabungan pengajuan infaq + usulan item baru.
  const subCards: RecentCard[] = allSubs.slice(0, 5).map((s) => ({
    key: `s-${s.id}`, type: "submission", name: s.item_name, nickname: s.nickname,
    qty: s.qty_label || (s.unit ? `satuan ${s.unit}` : ""), status: s.status, created_at: s.created_at, event_id: s.event_id,
  }));
  const propCards: RecentCard[] = pendingProps.slice(0, 3).map((p) => ({
    key: `p-${p.id}`, type: "proposal", name: p.name, nickname: p.nickname,
    qty: p.qty_label || (p.qty != null ? `${p.qty}${p.unit ? " " + p.unit : ""}` : ""), status: p.status, created_at: p.created_at, event_id: p.event_id,
  }));
  const cards = [...subCards, ...propCards].sort((a, b) => ts(b.created_at) - ts(a.created_at)).slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Hero kegiatan terdekat */}
      <div className="banner-grad animate-fade-up relative overflow-hidden rounded-[22px] px-5 py-5 text-white shadow-md shadow-emerald-800/20">
        <Image
          src="/images/hero-mosque.webp"
          alt=""
          width={1400}
          height={781}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right opacity-20"
          aria-hidden
        />
        <div className="relative z-10 max-w-[72%]">
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-100">Kegiatan Terdekat</p>
          {event ? (
            <>
              <h1 className="mt-1 text-[22px] font-extrabold leading-tight">{event.title}</h1>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-semibold text-emerald-50">
                <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(event.event_date)}{event.event_time ? ` · ${formatEventTime(event.event_time)}` : ""}</span>
                {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>}
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-1 text-[20px] font-extrabold leading-tight">Belum ada kegiatan</h1>
              <Link href="/panitia/kegiatan" className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-bold">
                <CalendarPlus className="h-4 w-4" /> Buat kegiatan
              </Link>
            </>
          )}
        </div>
        <p className="absolute bottom-4 right-4 z-10 text-right text-[15px] font-extrabold italic leading-tight text-gold">
          Dari Kita<br />Untuk Kita
        </p>
      </div>

      {/* Progress Stepper 1–5 */}
      <ProgressStepper current={current} />

      {/* Statistik ringkas (tanpa nominal uang — sistem barang & tenaga) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Users} label="Anggota" value={counts.members} caption="pengaju unik" tile="bg-emerald-50" ic="text-emerald-600" />
        <Stat icon={Package} label="Item Kebutuhan" value={totalItems} caption="item kegiatan" tile="bg-sky-50" ic="text-sky-600" />
        <Stat icon={TrendingUp} label="Terpenuhi" value={`${percent}%`} caption={`${fulfilled}/${totalItems} item`} tile="bg-emerald-50" ic="text-emerald-700" />
        <Stat icon={PackageCheck} label="Diterima Fisik" value={receivedCount} caption="sudah diterima" tile="bg-amber-50" ic="text-amber-500" />
      </div>

      {/* Usulan menunggu persetujuan */}
      {counts.proposalsPending > 0 && (
        <Link href="/panitia/usulan" className="flex items-center gap-3 rounded-[20px] bg-amber-50 px-4 py-3 ring-1 ring-amber-200 transition hover:shadow-md">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white"><Lightbulb className="h-5 w-5" /></span>
          <p className="flex-1 text-[13px] font-extrabold text-amber-900">{counts.proposalsPending} usulan item baru menunggu persetujuan</p>
          <ChevronRight className="h-4 w-4 shrink-0 text-amber-600" />
        </Link>
      )}

      {/* Pengajuan terbaru (kartu) */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
            <Megaphone className="h-4 w-4 text-emerald-700" /> Pengajuan Terbaru
          </h2>
          <Link href="/panitia/pengajuan" className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-bold text-emerald-700">
            Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {cards.length === 0 ? (
          <div className="card px-5 py-6 text-center text-sm text-stone-500">Belum ada pengajuan masuk.</div>
        ) : (
          <div className="space-y-2.5">
            {cards.map((c) => <RecentSubmissionCard key={c.key} card={c} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function RecentSubmissionCard({ card }: { card: RecentCard }) {
  const isProposal = card.type === "proposal";
  const href = isProposal
    ? "/panitia/usulan"
    : card.status === "approved"
      ? `/panitia/barang?event=${card.event_id}`
      : "/panitia/pengajuan";
  const cta = isProposal
    ? card.status === "pending" ? "Tinjau" : null
    : card.status === "pending" ? "Verifikasi"
      : card.status === "needs_confirmation" ? "Konfirmasi"
        : card.status === "approved" ? "Catat Terima"
          : null;

  return (
    <Link href={href} className="card flex items-center gap-3 px-4 py-3 transition hover:shadow-md">
      <Avatar name={card.nickname} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-extrabold text-ink">{card.name}</p>
        <p className="truncate text-[12px] text-stone-500">oleh {card.nickname}{card.qty ? ` · ${card.qty}` : ""}</p>
        <span className={`chip mt-1 ${isProposal ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
          {isProposal ? "Usulan Baru" : "Item Admin"}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {isProposal
          ? <ProposalStatusChip status={card.status as "pending" | "approved" | "rejected"} />
          : <SubmissionStatusChip status={card.status as "pending" | "approved" | "needs_confirmation" | "rejected" | "done"} />}
        <span className="text-[11px] text-stone-400">{relativeTime(card.created_at)}</span>
        {cta && <span className="chip bg-emerald-600 text-white">{cta}</span>}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
    </Link>
  );
}

function Stat({
  icon: Icon, label, value, caption, tile, ic,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string; value: number | string; caption: string; tile: string; ic: string;
}) {
  return (
    <div className={`rounded-[20px] ${tile} px-3 py-3.5 text-center ring-1 ring-emerald-900/5`}>
      <Icon className={`mx-auto h-7 w-7 ${ic}`} strokeWidth={2} />
      <p className="mt-1.5 text-[24px] font-extrabold leading-tight text-ink">{typeof value === "number" ? value.toLocaleString("id-ID") : value}</p>
      <p className="text-[12px] font-bold text-ink/80">{label}</p>
      <p className="text-[10px] font-semibold text-emerald-700">{caption}</p>
    </div>
  );
}
