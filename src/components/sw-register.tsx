"use client";

import { useEffect } from "react";

/** Daftarkan service worker sekali di seluruh halaman (agar push tetap aktif saat app ditutup). */
export function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
