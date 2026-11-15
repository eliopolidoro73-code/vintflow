import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { SeoJsonLd } from "@/components/SeoJsonLd";
import { getPublicSiteUrl } from "@/lib/site";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default:
      "Vintflow — Logiciel de Gestion Vinted, Leboncoin, TikTok Shop & eBay",
    template: "%s · Vintflow",
  },
  description:
    "Centralise tout ton business de revente : ventes, marge commerciale, crosslisting Vinted ↔ Leboncoin, studio photo IA, stock SKU, bordereaux 10×15 et factures PDF.",
  keywords: [
    "logiciel vinted",
    "crosslisting vinted leboncoin",
    "gestion stock revendeur",
    "marge commerciale vinted",
    "facture micro bic",
    "outil revente seconde main",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "Vintflow",
    title: "Vintflow — Back-office multi-plateformes pour revendeurs",
    description:
      "Stock SKU, crosslisting, trésorerie et IA pour Vinted, Leboncoin, TikTok Shop et eBay.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vintflow — Gestion Vinted & Leboncoin",
    description:
      "Le cockpit des revendeurs pro : marge, crosslist, factures PDF et assistant Nova.",
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  ...(process.env.GOOGLE_SITE_VERIFICATION?.trim()
    ? {
        verification: {
          google: process.env.GOOGLE_SITE_VERIFICATION.trim(),
        },
      }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-[#07080d] text-slate-100">
        <SeoJsonLd />
        {children}
      </body>
    </html>
  );
}
