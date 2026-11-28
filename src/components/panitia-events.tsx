"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronUp, Globe, EyeOff, Archive, RotateCcw, Link2 } from "lucide-react";
import {
  createEventAction, updateEventAction, setEventStatusAction, deleteEventAction,
  addItemAction, updateItemAction, deleteItemAction, toggleItemOpenAction,
} from "@/lib/actions";
import type { EventRow, ItemWithStatus } from "@/lib/types";
import { ItemStatusChip, formatDate } from "@/components/ui";

function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error || "Terjadi kesalahan.");
      else router.refresh();
    });
  }
  return { pending, error, run, setError };
}

export function CreateEventForm() {
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useAction();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="h-4 w-4" /> Buat Kegiatan Baru
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(() => createEventAction(null, fd).then((r) => { if (r.ok) setOpen(false); return r; }));
      }}
      className="card space-y-3 px-5 py-5"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold text-ink">Kegiatan Baru</p>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2 py-1"><X className="h-4 w-4" /></button>
      </div>
      <div>
        <label className="label">Nama kegiatan</label>
        <input name="title" required maxLength={150} placeholder="mis. Persiapan Acara Cigatas" className="input" />
      </div>
      <div>
        <label className="label">Deskripsi</label>
        <textarea name="description" maxLength={4000} rows={2} placeholder="Ajakan singkat untuk anggota" className="input resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Tanggal</label>
          <input name="event_date" type="date" className="input" />
        </div>
        <div>
          <label className="label">Lokasi</label>
          <input name="location" maxLength={150} placeholder="mis. Balai Warga" className="input" />
        </div>
      </div>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">{pending ? "Menyimpan..." : "Simpan sebagai Draft"}</button>
      <p className="text-[11px] text-stone-400">Draft belum terlihat publik. Aktifkan setelah kebutuhan siap.</p>
    </form>
  );
}

export function EventCard({ event, items }: { event: EventRow; items: ItemWithStatus[] }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const { pending, error, run } = useAction();
  const fulfilled = items.filter((i) => i.status === "fulfilled").length;

  const statusChip = {
    draft: <span className="chip bg-stone-100 text-stone-500"><EyeOff className="h-3 w-3" /> Draft</span>,
    active: <span className="chip bg-emerald-100 text-emerald-800"><Globe className="h-3 w-3" /> Aktif</span>,
    completed: <span className="chip bg-sky-100 text-sky-800"><Archive className="h-3 w-3" /> Selesai</span>,
    archived: <span className="chip bg-stone-100 text-stone-600"><Archive className="h-3 w-3" /> Arsip</span>,
  }[event.status];

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-extrabold text-ink">{event.title}</h3>
              {statusChip}
            </div>
            <p className="mt-0.5 text-xs text-stone-400">{formatDate(event.event_date)}{event.location ? ` · ${event.location}` : ""}</p>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="btn-ghost shrink-0 px-2 py-1" aria-label="Detail">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-2 text-xs font-bold text-stone-500">{fulfilled}/{items.length} item terpenuhi · /kegiatan/{event.slug}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {event.status === "draft" && (
            <button disabled={pending} onClick={() => run(() => setEventStatusAction(event.id, "active"))} className="btn-primary px-3 py-1.5 text-xs">
              <Globe className="h-3.5 w-3.5" /> Aktifkan
            </button>
          )}
          {event.status === "active" && (
            <button disabled={pending} onClick={() => run(() => setEventStatusAction(event.id, "completed"))} className="btn-secondary px-3 py-1.5 text-xs">
              <Archive className="h-3.5 w-3.5" /> Tandai Selesai → Arsip
            </button>
          )}
          {(event.status === "completed" || event.status === "archived") && (
            <button disabled={pending} onClick={() => run(() => setEventStatusAction(event.id, "active"))} className="btn-ghost px-3 py-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" /> Aktifkan Lagi
            </button>
          )}
          <button onClick={() => setEditing(!editing)} className="btn-ghost px-3 py-1.5 text-xs">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <a href={`/kegiatan/${event.slug}`} target="_blank" className="btn-ghost px-3 py-1.5 text-xs">
            <Link2 className="h-3.5 w-3.5" /> Link Publik
          </a>
          <button
            disabled={pending}
            onClick={() => { if (confirm(`Hapus kegiatan "${event.title}" beserta semua datanya?`)) run(() => deleteEventAction(event.id)); }}
            className="btn-danger px-3 py-1.5 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" /> Hapus
          </button>
        </div>
        {error && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}
      </div>

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("id", String(event.id));
            run(() => updateEventAction(null, fd).then((r) => { if (r.ok) setEditing(false); return r; }));
          }}
          className="space-y-3 border-t border-stone-100 bg-stone-50 px-5 py-4"
        >
          <div>
            <label className="label">Nama kegiatan</label>
            <input name="title" defaultValue={event.title} required maxLength={150} className="input" />
          </div>
          <div>
            <label className="label">Deskripsi</label>
            <textarea name="description" defaultValue={event.description} maxLength={4000} rows={2} className="input resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tanggal</label>
              <input name="event_date" type="date" defaultValue={event.event_date || ""} className="input" />
            </div>
            <div>
              <label className="label">Lokasi</label>
              <input name="location" defaultValue={event.location} maxLength={150} className="input" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary px-4 py-2 text-xs"><Check className="h-3.5 w-3.5" /> Simpan</button>
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost px-4 py-2 text-xs">Batal</button>
          </div>
        </form>
      )}

      {expanded && (
        <div className="border-t border-stone-100 px-5 py-4">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-stone-400">Ringkasan Kebutuhan</p>
          <div className="flex flex-wrap gap-1.5">
            {items.slice(0, 8).map((item) => (
              <span key={item.id} className="chip bg-stone-50 text-stone-600 ring-1 ring-stone-100">
                {item.name} · {item.target_label}
              </span>
            ))}
            {items.length > 8 && <span className="chip bg-stone-50 text-stone-400">+{items.length - 8} lainnya</span>}
            {items.length === 0 && <span className="text-xs text-stone-400">Belum ada kebutuhan.</span>}
          </div>
          <a href={`/panitia/kebutuhan?event=${event.id}`} className="btn-secondary mt-3 w-full py-2 text-xs">
            Kelola Kebutuhan Kegiatan Ini
          </a>
          <p className="mt-2 text-[11px] text-stone-400">
            Tambah/ubah kebutuhan ada di menu <b>Kelola Kebutuhan</b> agar tiap menu tetap terpisah dan mudah dipakai.
          </p>
        </div>
      )}
    </div>
  );
}

/** Panel daftar kebutuhan satu kegiatan — dipakai halaman Kelola Kebutuhan. */
export function EventItemsPanel({ eventId, items }: { eventId: number; items: ItemWithStatus[] }) {
  return (
    <div className="card px-5 py-4">
      <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-stone-400">
        Daftar Kebutuhan ({items.length})
      </p>
      <div className="space-y-2">
        {items.map((item) => <ItemRow key={item.id} item={item} />)}
        {items.length === 0 && (
          <p className="rounded-xl bg-stone-50 px-4 py-3 text-xs text-stone-400">
            Belum ada kebutuhan. Tambahkan barang/sembako atau kebutuhan tenaga di bawah.
          </p>
        )}
      </div>
      <AddItemForm eventId={eventId} />
    </div>
  );
}

function ItemRow({ item }: { item: ItemWithStatus }) {
  const [editing, setEditing] = useState(false);
  const { pending, error, run } = useAction();

  return (
    <div className="rounded-xl bg-stone-50 px-4 py-3 ring-1 ring-stone-100">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">{item.name} <span className="font-semibold text-stone-400">· {item.target_label}</span></p>
          {item.received_label && <p className="text-[11px] text-stone-400">Terkumpul: {item.received_label}{item.pic_name ? ` · PJ: ${item.pic_name}` : ""}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ItemStatusChip status={item.status} />
          <button onClick={() => setEditing(!editing)} className="btn-ghost px-1.5 py-1" aria-label="Edit item"><Pencil className="h-3.5 w-3.5" /></button>
          <button
            disabled={pending}
            onClick={() => run(() => toggleItemOpenAction(item.id, !item.is_open))}
            className="btn-ghost px-1.5 py-1"
            title={item.is_open ? "Tandai terpenuhi / tutup" : "Buka kembali"}
          >
            {item.is_open ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <RotateCcw className="h-3.5 w-3.5" />}
          </button>
          <button
            disabled={pending}
            onClick={() => { if (confirm(`Hapus item "${item.name}"?`)) run(() => deleteItemAction(item.id)); }}
            className="btn-ghost px-1.5 py-1 text-rose-400"
            aria-label="Hapus item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {error && <p className="mt-1 text-[11px] font-semibold text-rose-600">{error}</p>}
      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set("id", String(item.id));
            run(() => updateItemAction(null, fd).then((r) => { if (r.ok) setEditing(false); return r; }));
          }}
          className="mt-3 grid grid-cols-2 gap-2"
        >
          <input name="name" defaultValue={item.name} required maxLength={100} className="input col-span-2 py-2 text-xs" placeholder="Nama item" />
          <input name="target_label" defaultValue={item.target_label} required maxLength={80} className="input py-2 text-xs" placeholder="Target (mis. 40 Kg)" />
          <input name="unit" defaultValue={item.unit} maxLength={30} className="input py-2 text-xs" placeholder="Satuan (Kg/Dus)" />
          <input name="note" defaultValue={item.note} maxLength={1000} className="input col-span-2 py-2 text-xs" placeholder="Catatan (opsional)" />
          <button type="submit" disabled={pending} className="btn-primary col-span-2 py-2 text-xs">Simpan Item</button>
        </form>
      )}
    </div>
  );
}

function AddItemForm({ eventId }: { eventId: number }) {
  const [open, setOpen] = useState(false);
  const { pending, error, run } = useAction();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary mt-3 w-full py-2 text-xs">
        <Plus className="h-3.5 w-3.5" /> Tambah Item Kebutuhan
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("event_id", String(eventId));
        run(() => addItemAction(null, fd).then((r) => { if (r.ok) { setOpen(false); } return r; }));
      }}
      className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100"
    >
      <input name="name" required maxLength={100} className="input col-span-2 py-2 text-xs" placeholder="Nama item (mis. Beras)" />
      <input name="target_label" required maxLength={80} className="input py-2 text-xs" placeholder="Target (mis. 40 Kg / Secukupnya)" />
      <input name="unit" maxLength={30} className="input py-2 text-xs" placeholder="Satuan (Kg/Dus)" />
      <input name="note" maxLength={1000} className="input col-span-2 py-2 text-xs" placeholder="Catatan (opsional)" />
      {error && <p className="col-span-2 text-[11px] font-semibold text-rose-600">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary py-2 text-xs">Tambah</button>
      <button type="button" onClick={() => setOpen(false)} className="btn-ghost py-2 text-xs">Batal</button>
    </form>
  );
}
