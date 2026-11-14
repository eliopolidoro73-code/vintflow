import crypto from "node:crypto";
import { sql } from "./db";

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "local";
}

export function hashRateKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export async function checkRateLimit(params: {
  scope: string;
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<{ allowed: boolean; remaining: number }> {
  const bucket = `${params.scope}:${hashRateKey(params.key)}`;
  const windowMs = params.windowSeconds * 1000;
  const nextReset = new Date(Date.now() + windowMs).toISOString();

  // Periodically prune expired buckets
  await sql("delete from rate_limits where reset_at < now()", []);

  const rows = await sql<{ count: number }>(
    `insert into rate_limits (bucket, count, reset_at)
     values ($1, 1, $2)
     on conflict (bucket) do update
       set count = case
         when rate_limits.reset_at < now() then 1
         else rate_limits.count + 1
       end,
       reset_at = case
         when rate_limits.reset_at < now() then $2
         else rate_limits.reset_at
       end
     returning count`,
    [bucket, nextReset],
  );

  const count = Number(rows[0]?.count ?? 1);
  return {
    allowed: count <= params.limit,
    remaining: Math.max(0, params.limit - count),
  };
}
