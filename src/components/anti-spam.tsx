"use client";

import { useEffect, useState } from "react";

/**
 * Field anti-spam untuk form publik (tanpa akun):
 * - honeypot "company" (tersembunyi, hanya diisi bot),
 * - jebakan waktu "_ts" (dicatat saat form dibuka; server menolak bila terlalu instan).
 */
export function AntiSpamFields() {
  const [ts, setTs] = useState<number>(0);
  useEffect(() => {
    setTs(Date.now());
  }, []);
  return (
    <>
      <input type="hidden" name="_ts" value={ts || ""} readOnly />
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: 0, width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Jangan diisi kolom ini
          <input type="text" name="company" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
    </>
  );
}
