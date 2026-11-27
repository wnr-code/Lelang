import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Search, Clock3, CheckCircle2, XCircle, UserCheck, CalendarDays } from "lucide-react";
import { PublicHeader, PublicFooter, SubmissionStatusChip, formatDate } from "@/components/ui";
import { getSubmissionByCode } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function TrackPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const sub = await getSubmissionByCode(decodeURIComponent(code).toUpperCase());
  if (!sub) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <Link href="/" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-emerald-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke papan
        </Link>

        <section className="card mt-3 px-5 py-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Status Pengajuan Bantuan</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <code className="rounded-lg bg-stone-100 px-3 py-1.5 text-sm font-extrabold tracking-widest text-stone-700">{sub.track_code}</code>
            <SubmissionStatusChip status={sub.status} />
          </div>

          <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
            <Row label="Kegiatan" value={sub.event_title} />
            <Row label="Item" value={sub.item_name} />
            <Row label="Kesediaanmu" value={sub.qty_label || "Secukupnya"} />
            <Row label="Nama panggilan" value={sub.nickname} />
            <Row label="Diajukan" value={formatDateTime(sub.created_at)} />
            {sub.decided_at && <Row label="Diputuskan" value={formatDateTime(sub.decided_at)} />}
          </div>

          {sub.status === "pending" && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-xs leading-relaxed text-amber-800">
                Pengajuanmu sedang menunggu keputusan panitia. Keputusan penerima dan penanggung jawab
                sepenuhnya ada di panitia — cek halaman ini secara berkala.
              </p>
            </div>
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
                Silakan koordinasikan penyerahan barang dengan panitia sesuai arahan di atas. Terima kasih atas kebaikanmu!
              </p>
            </div>
          )}

          {sub.status === "rejected" && (
            <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200">
              <p className="flex items-center gap-2 text-sm font-extrabold text-rose-800">
                <XCircle className="h-4 w-4 text-rose-500" /> Pengajuan belum bisa diterima
              </p>
              {sub.decision_note && <p className="mt-1.5 text-xs leading-relaxed text-rose-700">“{sub.decision_note}”</p>}
              <p className="mt-2 text-xs text-rose-600">
                Jangan berkecil hati — masih banyak kebutuhan lain yang bisa kamu bantu.
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link href={`/kegiatan/${sub.event_slug}`} className="btn-secondary flex-1 text-xs">
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-stone-400">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}

function formatDateTime(s: string): string {
  const d = new Date(s.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) + ", " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
