import { sql } from "@/lib/db";

export async function GET() {
  try {
    await sql("select 1");
    return Response.json({ ok: true });
  } catch (err) {
    console.error("healthcheck failed", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
