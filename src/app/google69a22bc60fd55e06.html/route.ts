import { GOOGLE_HTML_VERIFICATION_BODY } from "@/lib/google-verification";

export const dynamic = "force-static";
export const revalidate = 86400;

export async function GET() {
  return new Response(`${GOOGLE_HTML_VERIFICATION_BODY}\n`, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}