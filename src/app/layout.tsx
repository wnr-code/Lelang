import type { Metadata, Viewport } from "next";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "./globals.css";
import { MobileNav } from "@/components/mobile-nav";

export const metadata: Metadata = {
  metadataBase: new URL("https://lelang.cgs.my.id"),
  title: {
    default: "Lelang Kebaikan Cigatas — Satu Kepedulian, Banyak Kebaikan",
    template: "%s · Lelang Kebaikan Cigatas",
  },
  description:
    "Papan gotong royong digital komunitas Cigatas. Lihat kebutuhan kegiatan, tawarkan bantuan, dan bersama kita penuhi kebutuhan sesama.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Cigatas", statusBarStyle: "default" },
  openGraph: {
    title: "Lelang Kebaikan Cigatas",
    description: "Satu Kepedulian, Banyak Kebaikan. Papan gotong royong digital komunitas Cigatas.",
    url: "https://lelang.cgs.my.id",
    siteName: "Lelang Kebaikan Cigatas",
    locale: "id_ID",
    type: "website",
    images: [{ url: "/images/og-cigatas.png", width: 1200, height: 630, alt: "Lelang Kebaikan Cigatas" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lelang Kebaikan Cigatas",
    description: "Satu Kepedulian, Banyak Kebaikan. Papan gotong royong digital komunitas Cigatas.",
    images: ["/images/og-cigatas.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-dvh font-sans">
        {children}
        <MobileNav />
      </body>
    </html>
  );
}
