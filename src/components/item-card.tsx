import { UserCheck, PackageCheck } from "lucide-react";
import { ItemStatusChip, ProgressBar } from "./ui";
import { HelpForm } from "./help-form";
import type { ItemWithStatus } from "@/lib/types";

/** Kartu kebutuhan (barang / sembako / tenaga) dengan progres & form bantuan. */
export function ItemCard({ item, isActive, slug }: { item: ItemWithStatus; isActive: boolean; slug: string }) {
  return (
    <div className="card px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold text-ink">{item.name}</h3>
          <p className="mt-0.5 text-sm font-semibold text-stone-500">
            {item.target_label}{item.unit ? ` · satuan ${item.unit}` : ""}
          </p>
          {item.note && <p className="mt-1 text-xs leading-relaxed text-stone-400">{item.note}</p>}
        </div>
        <ItemStatusChip status={item.status} />
      </div>

      {item.target_qty != null && item.received_qty > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[12px] font-semibold text-stone-400">
            <span>Terkumpul: {item.received_label}</span>
            <span>Target: {item.target_label}</span>
          </div>
          <ProgressBar value={item.received_qty} max={item.target_qty} />
        </div>
      )}

      {item.pic_name && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800">
          <UserCheck className="h-3.5 w-3.5" /> Penanggung jawab: {item.pic_name}
        </p>
      )}

      {isActive && item.status !== "fulfilled" && (
        <div className="mt-4">
          <HelpForm item={item} eventSlug={slug} />
        </div>
      )}
      {item.status === "fulfilled" && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
          <PackageCheck className="h-4 w-4" /> Alhamdulillah, kebutuhan ini sudah terpenuhi. Terima kasih!
        </p>
      )}
    </div>
  );
}
