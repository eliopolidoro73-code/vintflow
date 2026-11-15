import { NextResponse } from "next/server";
import { callCloudAi, isPersoCloudAiEnabled } from "@/lib/ai";

export const maxDuration = 30;

async function probeGemini(key: string): Promise<{ status: string; model?: string }> {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: 'Réponds uniquement {"ok":true}' }] }],
            generationConfig: {
              maxOutputTokens: 16,
              responseMimeType: "application/json",
            },
          }),
        },
      );
      if (res.ok) return { status: "ok", model };
      const err = await res.text();
      if (res.status === 400 && err.includes("API_KEY_INVALID")) {
        return { status: "invalid_key" };
      }
      if (res.status === 403) return { status: "forbidden", model };
    } catch {
      continue;
    }
  }
  return { status: "unreachable" };
}

async function probeOpenai(key: string): Promise<{ status: string }> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
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
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const powerFlag = process.env.PERSO_AI_POWER?.trim();

  const gemini = geminiKey
    ? await probeGemini(geminiKey)
    : { status: "not_configured" as const };
  const openai = openaiKey
    ? await probeOpenai(openaiKey)
    : { status: "not_configured" as const };

  let unified: { status: string; provider?: string } = { status: "skipped" };
  if (isPersoCloudAiEnabled()) {
    const out = await callCloudAi({
      systemPrompt: "Tu réponds en JSON.",
      userPrompt: 'Retourne {"ping":"vintflow"}',
      jsonMode: true,
      maxTokens: 32,
      power: true,
    });
    unified = out
      ? { status: "ok", provider: out.provider }
      : { status: "call_failed" };
  } else {
    unified = { status: "cloud_disabled" };
  }

  const anyOk =
    gemini.status === "ok" ||
    openai.status === "ok" ||
    unified.status === "ok";

  return NextResponse.json({
    ok: anyOk,
    cloudAiEnabled: isPersoCloudAiEnabled(),
    persoAiPower: powerFlag === "true" || (powerFlag !== "false" && anyOk),
    persoEnableCloudAi: process.env.PERSO_ENABLE_CLOUD_AI === "true",
    gemini,
    openai,
    unifiedEngine: unified,
    checkedAt: new Date().toISOString(),
  });
}