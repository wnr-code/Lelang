"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Recycle, Camera, Upload, X, Check } from "lucide-react";
import { addSurplusAction, updateSurplusAction, deleteSurplusAction, uploadPhotoAction, deletePhotoAction } from "@/lib/actions";
import type { SurplusRow, PhotoRow, ItemWithStatus } from "@/lib/types";
import { SURPLUS_DECISION_LABEL, SURPLUS_DECISION_OPTIONS, SURPLUS_CONDITION_LABEL } from "@/lib/types";
import Image from "next/image";
import { compressImageForUpload, MAX_UPLOAD_BYTES } from "@/lib/client-image";

function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setError(""); setMessage("");
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error || "Terjadi kesalahan.");
      else { setMessage(res.message || ""); router.refresh(); }
    });
  }
  return { pending, error, message, run };
}

// Lima pilihan pengelolaan sisa: Disimpan, Digunakan untuk kegiatan berikutnya,
// Ditukar, Dijual kembali, Disalurkan.
const DECISIONS = SURPLUS_DECISION_OPTIONS.map(
  (d) => [d, SURPLUS_DECISION_LABEL[d]] as [SurplusRow["decision"], string]
);

export function SurplusSection({ eventId, items, surplus }: { eventId: number; items: ItemWithStatus[]; surplus: SurplusRow[] }) {
  const [adding, setAdding] = useState(false);
  const { pending, error, run } = useAction();

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-extrabold uppercase tracking-widest text-stone-400">Kelebihan Barang</h2>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-secondary px-3 py-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Catat Sisa
          </button>
        )}
      </div>

      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("event_id", String(eventId));
            const sel = fd.get("item_id") as string;
            if (sel) {
              const it = items.find((i) => String(i.id) === sel);
              if (it) fd.set("item_name", it.name);
            }
            run(() => addSurplusAction(null, fd).then((r) => { if (r.ok) setAdding(false); return r; }));
          }}
          className="card mb-3 grid grid-cols-2 gap-2.5 px-5 py-4"
        >
          <div className="col-span-2 flex items-center justify-between">
            <p className="text-sm font-extrabold text-ink">Catat Sisa / Kelebihan Barang</p>
            <button type="button" onClick={() => setAdding(false)} className="btn-ghost px-2 py-1"><X className="h-4 w-4" /></button>
          </div>
          <div>
            <label className="label">Dari item (opsional)</label>
            <select name="item_id" className="input py-2.5 text-xs">
              <option value="">— barang lain —</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Nama barang</label>
            <input name="item_name" maxLength={100} className="input py-2.5 text-xs" placeholder="mis. Beras" />
          </div>
          <div>
            <label className="label">Jumlah</label>
            <input name="qty" type="number" min="0" step="any" className="input py-2.5 text-xs" placeholder="mis. 2" />
          </div>
          <div>
            <label className="label">Label jumlah</label>
            <input name="qty_label" maxLength={80} className="input py-2.5 text-xs" placeholder="mis. 2 Kg" />
          </div>
          <div>
            <label className="label">Kondisi</label>
            <select name="condition" className="input py-2.5 text-xs">
              <option value="sisa">Sisa</option>
              <option value="berlebih">Berlebih</option>
            </select>
          </div>
          <div>
            <label className="label">Keputusan</label>
            <select name="decision" className="input py-2.5 text-xs">
              {DECISIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Alasan / catatan keputusan</label>
            <input name="decision_note" maxLength={1000} className="input py-2.5 text-xs" placeholder="mis. Masih tersegel, layak disimpan" />
          </div>
          <div>
            <label className="label">Penanggung jawab</label>
            <input name="pic_name" maxLength={80} className="input py-2.5 text-xs" placeholder="mis. Teh Nisa" />
          </div>
          <div>
            <label className="label">Hasil (jika sudah)</label>
            <input name="outcome" maxLength={1000} className="input py-2.5 text-xs" placeholder="mis. Ditukar 3 kg gula" />
          </div>
          {error && <p className="col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}
          <button type="submit" disabled={pending} className="btn-primary col-span-2 py-2.5 text-xs">
            {pending ? "Menyimpan..." : "Simpan Catatan"}
          </button>
          <p className="col-span-2 text-center text-[11px] text-stone-400">Riwayat tersimpan permanen di arsip kegiatan.</p>
        </form>
      )}

      {surplus.length === 0 && !adding ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-8 text-center">
          <Recycle className="h-8 w-8 text-stone-300" />
          <p className="text-sm font-bold text-stone-600">Belum ada sisa barang tercatat</p>
          <p className="max-w-xs text-xs text-stone-400">Setelah acara, catat barang sisa/berlebih beserta keputusan pemanfaatannya.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {surplus.map((s) => <SurplusCard key={s.id} s={s} />)}
        </div>
      )}
    </section>
  );
}

function SurplusCard({ s }: { s: SurplusRow }) {
  const [editing, setEditing] = useState(false);
  const { pending, error, run } = useAction();

  return (
    <div className="card px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-ink">{s.item_name}</p>
          <p className="text-xs text-stone-400">{s.qty_label || "Jumlah tidak dicatat"} · {SURPLUS_CONDITION_LABEL[s.condition]}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`chip ${s.outcome ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
            {SURPLUS_DECISION_LABEL[s.decision]}
          </span>
          <button onClick={() => setEditing(!editing)} className="btn-ghost px-1.5 py-1"><Pencil className="h-3.5 w-3.5" /></button>
          <button
            disabled={pending}
            onClick={() => { if (confirm("Hapus catatan ini dari riwayat?")) run(() => deleteSurplusAction(s.id)); }}
            className="btn-ghost px-1.5 py-1 text-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {s.decision_note && <p className="mt-2 text-xs leading-relaxed text-stone-500">{s.decision_note}</p>}
      {s.outcome ? (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">Hasil: {s.outcome}</p>
      ) : (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">Belum ada hasil — tunggu pelaksanaan keputusan.</p>
      )}
      {s.pic_name && <p className="mt-2 text-xs font-bold text-stone-500">PJ: {s.pic_name}</p>}
      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("id", String(s.id));
            run(() => updateSurplusAction(null, fd).then((r) => { if (r.ok) setEditing(false); return r; }));
          }}
          className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-stone-50 p-3"
        >
          <div>
            <label className="label">Keputusan</label>
            <select name="decision" defaultValue={s.decision} className="input py-2 text-xs">
              {DECISIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Penanggung jawab</label>
            <input name="pic_name" defaultValue={s.pic_name} maxLength={80} className="input py-2 text-xs" />
          </div>
          <div className="col-span-2">
            <label className="label">Catatan keputusan</label>
            <input name="decision_note" defaultValue={s.decision_note} maxLength={1000} className="input py-2 text-xs" />
          </div>
          <div className="col-span-2">
            <label className="label">Hasil pelaksanaan</label>
            <input name="outcome" defaultValue={s.outcome} maxLength={1000} className="input py-2 text-xs" placeholder="mis. Sudah ditukar dengan 3 kg gula pasir" />
          </div>
          <button type="submit" disabled={pending} className="btn-primary col-span-2 py-2 text-xs"><Check className="h-3.5 w-3.5" /> Simpan Perubahan</button>
        </form>
      )}
    </div>
  );
}

export function PhotoSection({ eventId, photos }: { eventId: number; photos: PhotoRow[] }) {
  const { pending, error, message, run } = useAction();
  const [caption, setCaption] = useState("");

  return (
    <section>
      <h2 className="mb-3 text-xs font-extrabold uppercase tracking-widest text-stone-400">Dokumentasi Foto</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          fd.set("event_id", String(eventId));
          run(async () => {
            const raw = fd.get("photo");
            if (raw instanceof File && raw.size > 0) {
              const compressed = await compressImageForUpload(raw);
              if (compressed.size > MAX_UPLOAD_BYTES) {
                return { ok: false as const, error: "Foto masih lebih dari 2 MB setelah dikompres. Pilih foto yang lebih kecil." };
              }
              fd.set("photo", compressed, compressed.name);
            }
            const r = await uploadPhotoAction(null, fd);
            if (r.ok) { setCaption(""); form.reset(); }
            return r;
          });
        }}
        className="card mb-3 space-y-2.5 px-5 py-4"
      >
        <label className="label">Upload foto (otomatis dikompres)</label>
        <input
          name="photo"
          type="file"
          accept="image/*"
          required
          className="block w-full text-xs text-stone-500 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-emerald-700"
        />
        <input
          name="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={500}
          className="input py-2.5 text-xs"
          placeholder="Keterangan foto (opsional)"
        />
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}
        {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{message}</p>}
        <button type="submit" disabled={pending} className="btn-primary w-full py-2.5 text-xs">
          <Upload className="h-3.5 w-3.5" /> {pending ? "Mengompres & mengupload..." : "Upload Foto"}
        </button>
        <p className="text-center text-[11px] text-stone-400">Maks 2 MB — foto dikompres otomatis di HP & server (WebP) agar hemat kuota warga.</p>
      </form>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <figure key={p.id} className="card group relative overflow-hidden">
              <Image src={p.file_path} alt={p.caption || "Foto kegiatan"} width={400} height={300} className="aspect-[4/3] w-full object-cover" />
              {p.caption && <figcaption className="px-2.5 py-1.5 text-[10px] leading-snug text-stone-500">{p.caption}</figcaption>}
              <button
                onClick={() => { if (confirm("Hapus foto ini?")) run(() => deletePhotoAction(p.id)); }}
                className="absolute right-1.5 top-1.5 rounded-lg bg-white/90 p-1.5 text-rose-500 opacity-0 shadow transition group-hover:opacity-100"
                aria-label="Hapus foto"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
