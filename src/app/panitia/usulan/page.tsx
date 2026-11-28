import Link from "next/link";
import { redirect } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { isPanitia } from "@/lib/auth";
import { getProposals } from "@/lib/queries";
import { PanitiaProposals } from "@/components/panitia-proposals";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kelola Usulan" };

const FILTERS = [
  { id: "all", label: "Semua" },
  { id: "pending", label: "Menunggu" },
  { id: "approved", label: "Disetujui" },
  { id: "rejected", label: "Ditolak" },
];

export default async function UsulanPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!(await isPanitia())) redirect("/panitia/login");
  const { status } = await searchParams;
  const filter = status && FILTERS.some((f) => f.id === status) ? status : "pending";
  const proposals = await getProposals(undefined, filter);
  const pendingCount = (await getProposals(undefined, "pending")).length;

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <Lightbulb className="h-6 w-6" strokeWidth={1.9} />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-ink">Kelola Usulan Item</h1>
          <p className="text-[13px] text-stone-500">
            Usulan barang baru dari anggota. Setujui untuk menjadikannya kebutuhan resmi kegiatan.
          </p>
        </div>
      </div>

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={`/panitia/usulan?status=${f.id}`}
            className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition ${
              filter === f.id ? "bg-emerald-700 text-white" : "bg-white text-emerald-800 ring-1 ring-emerald-900/10 hover:bg-emerald-50"
            }`}
          >
            {f.label}{f.id === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </Link>
        ))}
      </div>

      <PanitiaProposals proposals={proposals} />
    </div>
  );
}
