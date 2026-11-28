import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PublicFooter } from "@/components/ui";
import { PublicHeader } from "@/components/public-header";
import { TrackSearch } from "@/components/track-search";

export const metadata = { title: "Lacak Pengajuan" };

export default function TrackSearchPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <Link href="/" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-emerald-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke papan
        </Link>
        <TrackSearch />
      </main>
      <PublicFooter />
    </div>
  );
}
