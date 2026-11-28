import { Settings } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/ui";
import { MemberSettings } from "@/components/member-settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pengaturan" };

export default function PengaturanPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Settings className="h-6 w-6" strokeWidth={1.9} />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-ink">Pengaturan</h1>
            <p className="text-xs text-stone-500">Preferensi anggota — tanpa login.</p>
          </div>
        </div>
        <MemberSettings />
      </main>
      <PublicFooter />
    </div>
  );
}
