import { PUBLIC_SEO_FAQ } from "@/lib/seo-faq";
import { getPublicSiteUrl } from "@/lib/site";

export function SeoJsonLd() {
  const siteUrl = getPublicSiteUrl();
  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "VintFlow",
        alternateName: ["Vintflow", "Vint Flow"],
        url: siteUrl,
        inLanguage: "fr-FR",
        description:
          "VintFlow — logiciel de gestion Vinted, Leboncoin, TikTok Shop et eBay pour revendeurs.",
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/guide-revente-vinted?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        name: "VintFlow",
        alternateName: "Vintflow",
        url: siteUrl,
        logo: `${siteUrl}/icon.svg`,
        description:
          "VintFlow, logiciel français de gestion et crosslisting pour revendeurs.",
      },
      {
        "@type": "SoftwareApplication",
        name: "VintFlow",
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
      {
        "@type": "FAQPage",
        mainEntity: PUBLIC_SEO_FAQ.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
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