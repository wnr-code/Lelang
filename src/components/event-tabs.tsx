"use client";

import { useMemo, useState } from "react";
import { Package, ShoppingBasket, HandHelping, Sparkles } from "lucide-react";
import { ItemCard } from "./item-card";
import { EmptyState } from "./ui";
import { ITEM_CATEGORY_LABEL, ITEM_CATEGORY_ORDER, type ItemCategory, type ItemWithStatus } from "@/lib/types";

const ICONS: Record<ItemCategory, React.ComponentType<{ className?: string }>> = {
  sembako: ShoppingBasket,
  barang: Package,
  tenaga: HandHelping,
  lainnya: Sparkles,
};

const DESC: Record<ItemCategory, string> = {
  sembako: "Bahan pokok & konsumsi jamaah: beras, gula, kopi, mie, air mineral, dan snack.",
  barang: "Perlengkapan acara: tikar, sound system, kantong, dan kebutuhan lain yang bisa dipinjam atau diinfaqkan.",
  tenaga: "Bantuan waktu & tenaga: juru parkir, masak, bongkar-angkut, kebersihan, penerima tamu, dokumentasi. Sebutkan waktu ketersediaan Anda.",
  lainnya: "Bantuan lain yang bermanfaat, sesuai arahan panitia.",
};

/** Kebutuhan acara dibagi per kategori dengan tab agar rapi, tidak menumpuk panjang. */
export function EventTabs({ items, isActive, slug, panitiaWa = "" }: { items: ItemWithStatus[]; isActive: boolean; slug: string; panitiaWa?: string }) {
  const groups = useMemo(() => {
    const map = new Map<ItemCategory, ItemWithStatus[]>();
    for (const c of ITEM_CATEGORY_ORDER) map.set(c, []);
    for (const it of items) (map.get(it.category) ?? map.get("lainnya")!).push(it);
    return map;
  }, [items]);

  const available = ITEM_CATEGORY_ORDER.filter((c) => (groups.get(c)?.length ?? 0) > 0);
  const [active, setActive] = useState<ItemCategory>(available[0] ?? "barang");
  const shown = groups.get(active) ?? [];

  if (items.length === 0) {
    return <EmptyState title="Belum ada kebutuhan" subtitle="Panitia sedang menyiapkan daftar kebutuhan untuk kegiatan ini." />;
  }

  return (
    <div>
      <div role="tablist" aria-label="Kategori kebutuhan" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {available.map((c) => {
          const Icon = ICONS[c];
          const list = groups.get(c)!;
          const open = list.filter((i) => i.is_open).length;
          const isActiveTab = c === active;
          return (
            <button
              key={c}
              role="tab"
              type="button"
              aria-selected={isActiveTab}
              onClick={() => setActive(c)}
              className={`flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[14px] font-extrabold transition active:scale-[0.98] ${
                isActiveTab
                  ? "bg-gradient-to-br from-emerald-700 to-emerald-800 text-white shadow-[0_6px_16px_rgba(7,91,53,0.25)]"
                  : "bg-white text-emerald-800 ring-1 ring-emerald-900/10 hover:bg-emerald-50"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActiveTab ? "text-gold" : "text-emerald-600"}`} />
              {ITEM_CATEGORY_LABEL[c]}
              <span className={`rounded-full px-1.5 py-0.5 text-[12px] font-extrabold ${isActiveTab ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
                {open}/{list.length}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-stone-500">{DESC[active]}</p>

      <div role="tabpanel" className="mt-3 space-y-3">
        {shown.map((it) => (
          <ItemCard key={it.id} item={it} isActive={isActive} slug={slug} panitiaWa={panitiaWa} />
        ))}
      </div>
    </div>
  );
}
