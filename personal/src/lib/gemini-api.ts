/** Appels Gemini (clés AIza… et Auth AQ.…). */

const STATIC_PROBE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-flash-latest",
  "gemini-pro-latest",
] as const;

const STATIC_POWER_MODELS = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-pro-latest",
] as const;

const STATIC_FAST_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-flash-latest",
] as const;

let cachedModelList: { at: number; models: string[] } | null = null;

async function discoverGeminiModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedModelList && now - cachedModelList.at < 5 * 60_000) {
    return cachedModelList.models;
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8_000);
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models",
      {
        headers: { "x-goog-api-key": apiKey },
        cache: "no-store",
        signal: ctrl.signal,
      },
    );
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      models?: Array<{
        name?: string;
        supportedGenerationMethods?: string[];
      }>;
    };
    const names =
      data.models
        ?.filter((m) =>
          m.supportedGenerationMethods?.includes("generateContent"),
        )
        .map((m) => (m.name ?? "").replace(/^models\//, ""))
        .filter(Boolean) ?? [];
    const ranked = [
      ...names.filter((n) => /2\.5-pro|2\.0-pro|1\.5-pro/i.test(n)),
      ...names.filter((n) => /flash/i.test(n) && !/embedding|image|tts/i.test(n)),
      ...names.filter((n) => !/embedding|image|tts|aqa|exp/i.test(n)),
    ];
    const unique = [...new Set(ranked)];
    cachedModelList = { at: now, models: unique };
    return unique;
  } catch {
    return [];
  }
}

export async function geminiModelsFor(
  apiKey: string,
  mode: "probe" | "power" | "fast",
): Promise<string[]> {
  const discovered = await discoverGeminiModels(apiKey);
  const staticList =
    mode === "probe"
      ? STATIC_PROBE_MODELS
      : mode === "power"
        ? STATIC_POWER_MODELS
        : STATIC_FAST_MODELS;
  if (discovered.length === 0) return [...staticList];
  const merged = [...discovered];
  for (const m of staticList) {
    if (!merged.includes(m)) merged.push(m);
  }
  return merged;
}

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
  const models = await geminiModelsFor(apiKey, "probe");
  for (const model of models) {
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