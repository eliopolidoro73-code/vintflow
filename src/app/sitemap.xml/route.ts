/** Sitemap fixe pour Google (domaine Vercel uniquement). */
export const dynamic = "force-static";
export const revalidate = 3600;

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://vintflow-vint4.vercel.app</loc>
    <changefreq>weekly</changefreq>
    <priority>1</priority>
  </url>
  <url>
    <loc>https://vintflow-vint4.vercel.app/guide-revente-vinted</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://vintflow-vint4.vercel.app/legal/mentions-legales</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://vintflow-vint4.vercel.app/legal/confidentialite</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://vintflow-vint4.vercel.app/legal/cgv</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
`;

export async function GET() {
  return new Response(SITEMAP, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}