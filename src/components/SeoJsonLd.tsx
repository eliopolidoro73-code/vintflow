import { getPublicSiteUrl } from "@/lib/site";

export function SeoJsonLd() {
  const siteUrl = getPublicSiteUrl();
  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Vintflow",
        url: siteUrl,
        logo: `${siteUrl}/icon.svg`,
        description:
          "Logiciel français de gestion et crosslisting pour revendeurs Vinted, Leboncoin, TikTok Shop et eBay.",
      },
      {
        "@type": "SoftwareApplication",
        name: "Vintflow",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "9",
          priceCurrency: "EUR",
        },
        description:
          "Back-office multi-plateformes : stock SKU, marge commerciale, crosslisting Vinted ↔ Leboncoin, factures PDF et assistant IA.",
        url: siteUrl,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}