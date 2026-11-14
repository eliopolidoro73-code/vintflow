import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Vintflow — Logiciel de Gestion Vinted, Leboncoin, TikTok Shop & eBay",
  description:
    "Centralise tout ton business de revente : ventes, marge commerciale, crosslisting Vinted ↔ Leboncoin, studio photo IA, stock SKU, bordereaux 10×15 et factures PDF.",
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
      <body className="min-h-full flex flex-col bg-[#090b0f] text-zinc-100">
        {children}
      </body>
    </html>
  );
}
