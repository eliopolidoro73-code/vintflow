import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { SeoJsonLd } from "@/components/SeoJsonLd";
import { getGoogleSiteVerificationMeta } from "@/lib/google-verification";
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
  applicationName: "VintFlow",
  title: {
    default:
      "VintFlow — Logiciel Vinted, Leboncoin, crosslisting & gestion revendeur",
    template: "%s · VintFlow",
  },
  description:
    "VintFlow centralise la revente Vinted, Leboncoin, TikTok Shop et eBay : marge commerciale, crosslisting, stock SKU, factures PDF et assistant IA.",
  keywords: [
    "VintFlow",
    "vintflow",
    "Vint Flow",
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
    siteName: "VintFlow",
    title: "VintFlow — Back-office multi-plateformes pour revendeurs",
    description:
      "Stock SKU, crosslisting, trésorerie et IA pour Vinted, Leboncoin, TikTok Shop et eBay.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VintFlow — Gestion Vinted & Leboncoin",
    description:
      "Le cockpit des revendeurs pro : marge, crosslist, factures PDF et assistant Nova.",
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  verification: {
    google: getGoogleSiteVerificationMeta(),
  },
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
