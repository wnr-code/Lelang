"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Bottom sheet ala Android: card muncul dari bawah ke atas saat dibuka.
 * - backdrop gelap, klik di luar / Esc / geser ke bawah untuk menutup,
 * - kunci scroll body, animasi slide, drag-handle.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [render, setRender] = useState(false);
  const [visible, setVisible] = useState(false);
  const dragStart = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setRender(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      document.body.style.overflow = "hidden";
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    document.body.style.overflow = "";
    const t = setTimeout(() => setRender(false), 320);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  useEffect(() => () => { document.body.style.overflow = ""; }, []);

  if (!mounted || !render) return null;

  function onPointerDown(e: React.PointerEvent) {
    dragStart.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (dragStart.current == null || !panelRef.current) return;
    const dy = Math.max(0, e.clientY - dragStart.current);
    panelRef.current.style.transform = `translateY(${dy}px)`;
  }
  function onPointerUp(e: React.PointerEvent) {
    if (dragStart.current == null || !panelRef.current) return;
    const dy = e.clientY - dragStart.current;
    panelRef.current.style.transform = "";
    dragStart.current = null;
    if (dy > 90) onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="presentation">
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/45 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Detail"}
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] w-full max-w-3xl flex-col rounded-t-[28px] bg-white shadow-[0_-12px_48px_rgba(7,91,53,0.28)] transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div
          className="shrink-0 cursor-grab touch-none px-5 pt-3 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="mx-auto h-1.5 w-12 rounded-full bg-stone-300" />
        </div>
        {title && (
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-3">
            <h3 className="min-w-0 truncate text-[17px] font-extrabold text-ink">{title}</h3>
            <button onClick={onClose} aria-label="Tutup" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition hover:bg-stone-200">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
