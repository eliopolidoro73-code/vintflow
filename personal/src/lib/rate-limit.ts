import crypto from "node:crypto";
import { sql } from "./db";

const TRUSTED_CLIENT_IP_HEADERS = [
  "cf-connecting-ip",
  "true-client-ip",
  "fly-client-ip",
  "x-vercel-forwarded-for",
  "x-real-ip",
] as const;

export function getClientIp(request: Request): string {
  for (const name of TRUSTED_CLIENT_IP_HEADERS) {
    const value = request.headers.get(name)?.trim();
    if (value) {
      const first = value.split(",")[0]?.trim();
      if (first) return first.slice(0, 64);
    }
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const peer = parts[parts.length - 1];
    if (peer) return peer.slice(0, 64);
  }

  const host = request.headers.get("host")?.trim();
  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);
  if (host) {
    const hostname = host.split(":")[0]?.toLowerCase() ?? "";
    if (localHosts.has(hostname)) {
      return "local-dev";
    }
  }

  return "unknown-ip";
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

export async function isRateLimited(params: {
  scope: string;
  key: string;
  limit: number;
}): Promise<boolean> {
  const bucket = `${params.scope}:${hashRateKey(params.key)}`;
  const rows = await sql<{ count: number }>(
    "select count from rate_limits where bucket = $1 and reset_at >= now()",
    [bucket],
  );
  return Number(rows[0]?.count ?? 0) >= params.limit;
}