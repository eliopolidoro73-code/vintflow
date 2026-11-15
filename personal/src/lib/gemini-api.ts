/** Appels Gemini (clés AIza… et Auth AQ.…). */

export const GEMINI_PROBE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
] as const;

export const GEMINI_POWER_MODELS = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
] as const;

export const GEMINI_FAST_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
] as const;

export function readGeminiApiKey(): string | undefined {
  const raw =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  if (!raw) return undefined;
  const cleaned = raw
    .replace(/^["'`]|["'`]$/g, "")
    .replace(/[\r\n\uFEFF]/g, "")
    .trim();
  return cleaned.length >= 8 ? cleaned : undefined;
}

export type GeminiGenerateBody = Record<string, unknown>;

export type GeminiCallResult =
  | { ok: true; model: string; data: unknown; text?: string }
  | { ok: false; httpStatus?: number; reason: string; model?: string };

function extractText(data: unknown): string | undefined {
  const d = data as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}

function classifyAuthFailure(httpStatus: number, body: string): string {
  if (httpStatus === 401) return "invalid_key";
  if (httpStatus === 403) {
    if (/API_KEY_INVALID|API key not valid/i.test(body)) return "invalid_key";
    return "forbidden";
  }
  if (httpStatus === 429) return "quota_or_rate_limit";
  if (/API_KEY_INVALID|invalid.?api.?key/i.test(body)) return "invalid_key";
  return `http_${httpStatus}`;
}

/** Header x-goog-api-key uniquement (pas de ?key= en plus — évite “multiple credentials”). */
export async function callGeminiGenerate(opts: {
  apiKey: string;
  model: string;
  body: GeminiGenerateBody;
}): Promise<GeminiCallResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": opts.apiKey,
      },
      body: JSON.stringify(opts.body),
      cache: "no-store",
    });
    const raw = await res.text();
    if (res.ok) {
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        return { ok: false, httpStatus: res.status, reason: "bad_json", model: opts.model };
      }
      const text = extractText(data);
      return { ok: true, model: opts.model, data, text };
    }
    return {
      ok: false,
      httpStatus: res.status,
      reason: classifyAuthFailure(res.status, raw),
      model: opts.model,
    };
  } catch {
    return { ok: false, reason: "network_error", model: opts.model };
  }
}

export async function probeGeminiKey(
  apiKey: string,
): Promise<{ status: string; model?: string; detail?: string }> {
  let lastReason = "no_model_succeeded";
  for (const model of GEMINI_PROBE_MODELS) {
    const result = await callGeminiGenerate({
      apiKey,
      model,
      body: {
        contents: [
          { role: "user", parts: [{ text: 'Réponds uniquement {"ok":true}' }] },
        ],
        generationConfig: {
          maxOutputTokens: 24,
          responseMimeType: "application/json",
        },
      },
    });
    if (result.ok) return { status: "ok", model: result.model };
    lastReason = result.reason;
    if (result.reason === "invalid_key" || result.reason === "forbidden") {
      return { status: result.reason, detail: result.model, model: result.model };
    }
  }
  return {
    status: lastReason === "network_error" ? "unreachable" : lastReason,
    detail: lastReason,
  };
}