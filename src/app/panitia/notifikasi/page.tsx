import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox, Recycle, Moon, ArrowRight, Bell } from "lucide-react";
import { isPanitia } from "@/lib/auth";
import { getSubmissions, getDashboardCounts } from "@/lib/queries";
import { ROUTINE, nextMalamJumatKe4, formatRoutineDate } from "@/lib/routine";
import { SubmissionStatusChip } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifikasi" };

export default async function NotifikasiPage() {
  if (!(await isPanitia())) redirect("/panitia/login");
  const all = await getSubmissions(undefined, "all");
  const pending = all.filter((s) => s.status === "pending" || s.status === "needs_confirmation");
  const counts = await getDashboardCounts();
  const nextRoutine = nextMalamJumatKe4();

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <Bell className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-ink">Notifikasi</h1>
          <p className="text-sm text-stone-500">Hal yang perlu perhatian panitia.</p>
        </div>
      </div>

      <div className="space-y-3">
        <Link href="/panitia/pengajuan" className="card flex items-center gap-4 px-5 py-4 transition hover:shadow-md">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Inbox className="h-5 w-5" /></span>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-ink">{pending.length} pengajuan perlu ditinjau</p>
            <p className="text-xs text-stone-400">Menunggu konfirmasi & perlu konfirmasi.</p>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-300" />
        </Link>

        <Link href="/panitia/laporan" className="card flex items-center gap-4 px-5 py-4 transition hover:shadow-md">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Recycle className="h-5 w-5" /></span>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-ink">{counts.unresolvedSurplus} sisa barang belum diproses</p>
            <p className="text-xs text-stone-400">Tentukan keputusan sisa/berlebih.</p>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-300" />
        </Link>

        <div className="card flex items-center gap-4 px-5 py-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Moon className="h-5 w-5" /></span>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-ink">Pengajian rutin: {formatRoutineDate(nextRoutine)}</p>
            <p className="text-xs text-stone-400">{ROUTINE.time} · {ROUTINE.place}</p>
          </div>
        </div>
      </div>

      {pending.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-stone-400">Pengajuan Terbaru</h2>
          <div className="space-y-2">
            {pending.slice(0, 5).map((s) => (
              <div key={s.id} className="card flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{s.nickname} · {s.item_name}</p>
                  <p className="text-xs text-stone-400">{s.event_title}</p>
                </div>
                <SubmissionStatusChip status={s.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
