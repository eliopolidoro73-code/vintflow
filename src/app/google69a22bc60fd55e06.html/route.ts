/** Fichier Search Console (ne pas supprimer après validation). */
export async function GET() {
  return new Response("google-site-verification: google69a22bc60fd55e06.html\n", {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}