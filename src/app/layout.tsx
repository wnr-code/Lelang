import type { Metadata, Viewport } from "next";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Lelang Kebaikan Cigatas — Satu Kepedulian, Banyak Kebaikan",
    template: "%s · Lelang Kebaikan Cigatas",
  },
  description:
    "Papan gotong royong digital komunitas Cigatas. Lihat kebutuhan kegiatan, tawarkan bantuan, dan bersama kita penuhi kebutuhan sesama.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Cigatas", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
