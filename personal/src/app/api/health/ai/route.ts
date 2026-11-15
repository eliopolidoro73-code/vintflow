import { NextResponse } from "next/server";
import { isPersoCloudAiEnabled } from "@/lib/ai";
import { probeGeminiKey, readGeminiApiKey } from "@/lib/gemini-api";

export const maxDuration = 30;

async function probeOpenai(key: string): Promise<{ status: string }> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key.replace(/^["']|["']$/g, "").trim()}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 8,
        messages: [
          { role: "user", content: "Réponds uniquement OK" },
        ],
      }),
    });
    if (res.ok) return { status: "ok" };
    if (res.status === 401) return { status: "invalid_key" };
    if (res.status === 429) return { status: "quota_or_rate_limit" };
    return { status: `http_${res.status}` };
  } catch {
    return { status: "unreachable" };
  }
}

/** Diagnostic clés IA (aucune clé exposée dans la réponse). */
export async function GET() {
  const geminiKey = readGeminiApiKey();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const powerFlag = process.env.PERSO_AI_POWER?.trim();
  const keyFormat = geminiKey
    ? geminiKey.startsWith("AQ.")
      ? "auth_aq"
      : geminiKey.startsWith("AIza")
        ? "standard_aiza"
        : "unknown_prefix"
    : undefined;

  const gemini = geminiKey
    ? { ...(await probeGeminiKey(geminiKey)), keyFormat }
    : { status: "not_configured" as const };

  const openai = openaiKey
    ? await probeOpenai(openaiKey)
    : { status: "not_configured" as const };

  let unified: { status: string; provider?: string } = { status: "skipped" };
  if (gemini.status === "ok") {
    unified = { status: "ok", provider: "gemini" };
  } else if (openai.status === "ok") {
    unified = { status: "ok", provider: "openai" };
  } else if (isPersoCloudAiEnabled()) {
    unified = { status: "call_failed" };
  } else {
    unified = { status: "cloud_disabled" };
  }

  const anyOk = gemini.status === "ok" || openai.status === "ok";

  return NextResponse.json({
    ok: anyOk,
    buildSha:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
      process.env.VERCEL_DEPLOYMENT_ID?.slice(0, 8),
    cloudAiEnabled: isPersoCloudAiEnabled(),
    persoAiPower: powerFlag === "true" || (powerFlag !== "false" && anyOk),
    persoEnableCloudAi: process.env.PERSO_ENABLE_CLOUD_AI === "true",
    gemini,
    openai,
    unifiedEngine: unified,
    checkedAt: new Date().toISOString(),
  });
}