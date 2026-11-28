import Image from "next/image";

/** Judul utama "Lelang Kebaikan" dengan grafis ketuk palu. */
export function LelangTitle({ subtitle = "Pilih kebutuhan, tawarkan bantuan — panitia yang menetapkan." }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_6px_18px_rgba(7,91,53,0.10)] ring-1 ring-emerald-900/5">
        <Image src="/images/gavel.webp" alt="Grafis ketuk palu Lelang Kebaikan" width={220} height={220} className="h-11 w-11 object-contain" />
      </span>
      <div className="min-w-0">
        <h2 className="text-[22px] font-extrabold leading-tight tracking-tight text-emerald-800">Lelang Kebaikan</h2>
        <p className="mt-0.5 text-[13px] leading-snug text-stone-500">{subtitle}</p>
      </div>
    </div>
  );
}
