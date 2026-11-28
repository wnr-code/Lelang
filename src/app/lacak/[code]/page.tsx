import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Search, Clock3, CheckCircle2, XCircle, UserCheck, CalendarDays, HelpCircle, Lightbulb } from "lucide-react";
import { PublicFooter, SubmissionStatusChip, ProposalStatusChip } from "@/components/ui";
import { PublicHeader } from "@/components/public-header";
import { StatusTimeline } from "@/components/status-timeline";
import { getSubmissionByCode, getProposalByCode } from "@/lib/queries";
import { getStatusLogs } from "@/lib/status-log";
import { SUBMISSION_STATUS_LABEL, PROPOSAL_STATUS_LABEL, ITEM_CATEGORY_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TrackPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = decodeURIComponent(code).toUpperCase();
  const sub = await getSubmissionByCode(clean);
  const proposal = sub ? undefined : await getProposalByCode(clean);
  if (!sub && !proposal) notFound();

  const logs = sub
    ? await getStatusLogs("submission", sub.id)
    : await getStatusLogs("proposal", proposal!.id);

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <Link href="/" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-emerald-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke papan
        </Link>

        <section className="card mt-3 px-5 py-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
            {sub ? "Status Pengajuan Bantuan" : "Status Usulan Item Baru"}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <code className="rounded-lg bg-stone-100 px-3 py-1.5 text-sm font-extrabold tracking-widest text-stone-700">{clean}</code>
            {sub ? <SubmissionStatusChip status={sub.status} /> : <ProposalStatusChip status={proposal!.status} />}
          </div>

          {sub ? <SubmissionBody sub={sub} /> : <ProposalBody proposal={proposal!} />}

          <StatusTimeline logs={logs} labels={sub ? SUBMISSION_STATUS_LABEL : PROPOSAL_STATUS_LABEL} />

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link href={`/kegiatan/${sub ? sub.event_slug : proposal!.event_slug}`} className="btn-secondary flex-1 text-xs">
              <CalendarDays className="h-4 w-4" /> Lihat Kegiatan
            </Link>
            <Link href="/lacak" className="btn-ghost flex-1 text-xs">
              <Search className="h-4 w-4" /> Lacak Kode Lain
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function SubmissionBody({ sub }: { sub: NonNullable<Awaited<ReturnType<typeof getSubmissionByCode>>> }) {
  return (
    <>
      <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
        <Row label="Kegiatan" value={sub.event_title} />
        <Row label={sub.item_kind === "tenaga" ? "Jenis bantuan" : "Barang"} value={sub.item_name} />
        <Row label="Kesediaanmu" value={sub.qty_label || "Secukupnya"} />
        {(sub.unit || sub.item_unit) && <Row label="Satuan" value={sub.unit || sub.item_unit} />}
        {sub.availability && <Row label="Waktu tersedia" value={sub.availability} />}
        <Row label="Nama panggilan" value={sub.nickname} />
        <Row label="Diajukan" value={formatDateTime(sub.created_at)} />
        {sub.decided_at && <Row label="Diputuskan" value={formatDateTime(sub.decided_at)} />}
      </div>

      {sub.status === "pending" && (
        <Note tone="amber" icon={<Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}>
          Pengajuanmu sedang menunggu konfirmasi panitia. Keputusan penerima dan penanggung jawab
          sepenuhnya ada di panitia — cek halaman ini secara berkala.
        </Note>
      )}
      {sub.status === "approved" && (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
          <p className="flex items-center gap-2 text-sm font-extrabold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Pengajuanmu disetujui!
          </p>
          {sub.decision_note && <p className="mt-1.5 text-xs leading-relaxed text-emerald-800">“{sub.decision_note}”</p>}
          {sub.pic_name === sub.nickname && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
              <UserCheck className="h-3.5 w-3.5" /> Kamu ditetapkan sebagai penanggung jawab item ini.
            </p>
          )}
          <p className="mt-2 text-xs text-emerald-700">
            Kesediaanmu tercatat, namun belum dihitung sebagai barang diterima sampai panitia memverifikasi penyerahan.
          </p>
        </div>
      )}
      {sub.status === "needs_confirmation" && (
        <Note tone="sky" icon={<HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />}>
          Panitia perlu memastikan detail bantuanmu. Silakan tunggu dihubungi lewat WhatsApp.
          {sub.decision_note && <span className="mt-1 block italic">“{sub.decision_note}”</span>}
        </Note>
      )}
      {sub.status === "done" && (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
          <p className="flex items-center gap-2 text-sm font-extrabold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Selesai — bantuanmu sudah diterima
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-emerald-800">
            Panitia sudah memverifikasi penerimaan bantuanmu. Jazakumullahu khairan atas kebaikan yang dititipkan.
          </p>
          {sub.decision_note && <p className="mt-1.5 text-xs italic text-emerald-700">“{sub.decision_note}”</p>}
        </div>
      )}
      {sub.status === "rejected" && (
        <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200">
          <p className="flex items-center gap-2 text-sm font-extrabold text-rose-800">
            <XCircle className="h-4 w-4 text-rose-500" /> Pengajuan belum bisa diterima
          </p>
          {sub.decision_note && <p className="mt-1.5 text-xs leading-relaxed text-rose-700">“{sub.decision_note}”</p>}
          <p className="mt-2 text-xs text-rose-600">Jangan berkecil hati — masih banyak kebutuhan lain yang bisa kamu bantu.</p>
        </div>
      )}
    </>
  );
}

function ProposalBody({ proposal }: { proposal: NonNullable<Awaited<ReturnType<typeof getProposalByCode>>> }) {
  return (
    <>
      <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
        <Row label="Kegiatan" value={proposal.event_title} />
        <Row label="Barang diusulkan" value={proposal.name} />
        <Row label="Jumlah" value={proposal.qty_label || (proposal.qty != null ? String(proposal.qty) : "Secukupnya")} />
        {proposal.unit && <Row label="Satuan" value={proposal.unit} />}
        <Row label="Kategori" value={ITEM_CATEGORY_LABEL[proposal.category]} />
        <Row label="Nama panggilan" value={proposal.nickname} />
        {proposal.note && <Row label="Keterangan" value={proposal.note} />}
        <Row label="Diajukan" value={formatDateTime(proposal.created_at)} />
        {proposal.decided_at && <Row label="Diputuskan" value={formatDateTime(proposal.decided_at)} />}
      </div>

      {proposal.status === "pending" && (
        <Note tone="amber" icon={<Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}>
          Usulanmu sedang menunggu persetujuan panitia. Bila disetujui, item ini menjadi kebutuhan resmi
          dan anggota lain dapat ikut berkontribusi.
        </Note>
      )}
      {proposal.status === "approved" && (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
          <p className="flex items-center gap-2 text-sm font-extrabold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Usulan disetujui — jadi kebutuhan resmi!
          </p>
          {proposal.decision_note && <p className="mt-1.5 text-xs leading-relaxed text-emerald-800">“{proposal.decision_note}”</p>}
          <p className="mt-2 text-xs text-emerald-700">Alhamdulillah, usulanmu kini terbuka untuk kontribusi anggota lain.</p>
        </div>
      )}
      {proposal.status === "rejected" && (
        <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200">
          <p className="flex items-center gap-2 text-sm font-extrabold text-rose-800">
            <XCircle className="h-4 w-4 text-rose-500" /> Usulan belum disetujui
          </p>
          {proposal.decision_note && <p className="mt-1.5 text-xs leading-relaxed text-rose-700">“{proposal.decision_note}”</p>}
          <p className="mt-2 text-xs text-rose-600">Terima kasih atas usulannya — masih banyak kebutuhan lain yang bisa didukung.</p>
        </div>
      )}
    </>
  );
}

function Note({ tone, icon, children }: { tone: "amber" | "sky"; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === "amber" ? "bg-amber-50 ring-amber-200 text-amber-800" : "bg-sky-50 ring-sky-200 text-sky-800";
  return (
    <div className={`mt-4 flex items-start gap-2.5 rounded-xl px-4 py-3 ring-1 ${cls}`}>
      {icon}
      <p className="text-xs leading-relaxed">{children}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-stone-400">{label}</span>
      <span className="min-w-0 text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

function formatDateTime(s: string): string {
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) + ", " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
