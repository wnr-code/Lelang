"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, Check, MessageCircle } from "lucide-react";
import { waConfirmLink } from "@/lib/wa";

/** Kartu sukses bersama: kode unik + lacak + tombol konfirmasi WhatsApp. */
export function SubmissionSuccess({
  code,
  kind,
  itemName,
  nickname,
  panitiaWa = "",
  onClose,
}: {
  code: string;
  kind: "infaq" | "usulan";
  itemName: string;
  nickname: string;
  panitiaWa?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const waText =
    kind === "infaq"
      ? `Assalamu'alaikum panitia Cigatas. Saya ${nickname || "anggota"} mengajukan infaq "${itemName}" dengan kode ${code}. Mohon konfirmasi & arahan penyerahan. Jazakumullah khairan.`
      : `Assalamu'alaikum panitia Cigatas. Saya ${nickname || "anggota"} mengusulkan item baru "${itemName}" dengan kode ${code}. Mohon ditinjau & disetujui bila sesuai. Terima kasih.`;

  return (
    <div className="rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-emerald-900">
            {kind === "infaq" ? "Pengajuan terkirim!" : "Usulan terkirim!"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-800">
            {kind === "infaq"
              ? "Kesediaan infaqmu tercatat. Panitia akan memverifikasi — belum dihitung sebagai barang diterima. Simpan kode ini:"
              : "Usulanmu masuk ke panitia dengan status menunggu persetujuan. Bila disetujui, item jadi kebutuhan resmi. Simpan kode ini:"}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 truncate rounded-lg bg-white px-3 py-2 text-base font-extrabold tracking-widest text-emerald-700 ring-1 ring-emerald-200">{code}</code>
            <button onClick={copyCode} className="btn-ghost shrink-0 text-emerald-700" aria-label="Salin kode">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <a
            href={waConfirmLink(panitiaWa, waText)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-extrabold text-white shadow-md shadow-emerald-800/15 transition active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4" /> Konfirmasi via WhatsApp
          </a>
          <Link href={`/lacak/${code}`} className="btn-primary mt-2 w-full text-xs">
            Lacak {kind === "infaq" ? "Pengajuanku" : "Usulanku"}
          </Link>
          <button onClick={onClose} className="mt-2 w-full text-center text-xs font-semibold text-emerald-700 hover:underline">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
