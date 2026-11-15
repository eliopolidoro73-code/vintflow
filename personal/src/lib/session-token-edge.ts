/** Jetons de session compatibles Edge (middleware) — même format que `auth.ts`. */

export const SESSION_COOKIE_NAME = "vintflow_perso_session";

interface SessionPayload {
  uid: string;
  jti: string;
  exp: number;
}

function sessionSecret(): string | null {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) return envSecret;
  return null;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(pad);
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function hmacSha256Base64Url(
  secret: string,
  message: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return bytesToBase64Url(new Uint8Array(sig));
}

export async function verifySessionTokenEdge(
  token: string | undefined,
): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expected = await hmacSha256Base64Url(secret, encoded);
  if (sig.length !== expected.length) return null;
  let mismatch = 0;
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (mismatch !== 0) return null;

  try {
    const parsed = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(encoded)),
    ) as SessionPayload;
    if (!parsed.uid || !parsed.jti || typeof parsed.exp !== "number") return null;
    if (Date.now() > parsed.exp) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}

export async function stablePersoUserIdEdge(email: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`vintflow-perso:${email.toLowerCase()}`),
  );
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `a${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

export async function createSessionTokenEdge(userId: string): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  const payload: SessionPayload = {
    uid: userId,
    jti: crypto.randomUUID(),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
  };
  const encoded = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const sig = await hmacSha256Base64Url(secret, encoded);
  return `${encoded}.${sig}`;
}