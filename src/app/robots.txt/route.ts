export const dynamic = "force-static";
export const revalidate = 3600;

const BODY = `User-Agent: *
Allow: /
Disallow: /app
Disallow: /api/

Sitemap: https://vintflow-vint4.vercel.app/sitemap.xml
Host: https://vintflow-vint4.vercel.app
`;

export async function GET() {
  return new Response(BODY, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}