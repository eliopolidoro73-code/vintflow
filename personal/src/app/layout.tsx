import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#060b18",
};

export const metadata: Metadata = {
  title: "Vintflow Perso — Cockpit Vinted & Leboncoin",
  description:
    "Édition privée complète pour piloter tes ventes, marge commerciale, studio photo IA, crosslisting et factures depuis ton iPhone.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vintflow",
  },
  icons: {
    apple: "/icon.svg",
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
      <body className="min-h-full flex flex-col bg-[#060b18] text-zinc-100">
        {children}
      </body>
    </html>
  );
}
