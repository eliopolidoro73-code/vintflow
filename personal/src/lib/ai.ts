import {
  callGeminiGenerate,
  geminiModelsFor,
  readGeminiApiKey,
} from "@/lib/gemini-api";

export interface AiCallResult {
  provider: "gemini" | "openai";
  text: string;
}

function parseDataUrl(
  dataUrl: string,
): { mimeType: string; base64: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(
    dataUrl.trim(),
  );
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

/** Actif si clé cloud présente (édition perso Vercel) ou flag explicite. */
export function isPersoCloudAiEnabled(): boolean {
  if (process.env.PERSO_ENABLE_CLOUD_AI === "false") return false;
  if (process.env.PERSO_ENABLE_CLOUD_AI === "true") return true;
  const hasKey = Boolean(
    readGeminiApiKey() || process.env.OPENAI_API_KEY?.trim(),
  );
  return hasKey;
}

function isPersoPowerAi(): boolean {
  if (process.env.PERSO_AI_POWER === "false") return false;
  return (
    process.env.PERSO_AI_POWER === "true" || isPersoCloudAiEnabled()
  );
}

/** Évite les coûts OpenAI sauf si explicitement autorisé. */
export function isOpenAiFallbackEnabled(): boolean {
  return process.env.PERSO_AI_OPENAI_FALLBACK === "true";
}

function maxGeminiModelsToTry(): number {
  const n = Number(process.env.PERSO_AI_MAX_GEMINI_RETRIES ?? 2);
  return Number.isFinite(n) ? Math.min(6, Math.max(1, n)) : 2;
}

export async function callCloudAi(params: {
  systemPrompt: string;
  userPrompt: string;
  imageDataUrl?: string;
  jsonMode?: boolean;
  maxTokens?: number;
  /** Modèles pro (Gemini 2.5 Pro / GPT-4o) et budget tokens plus large. */
  power?: boolean;
}): Promise<AiCallResult | null> {
  const power = params.power ?? isPersoPowerAi();
  const defaultTokens = power ? 1200 : 420;
  const maxTokens = Math.min(4096, params.maxTokens ?? defaultTokens);
  if (!isPersoCloudAiEnabled()) {
    return null;
  }

  let hitQuota = false;

  const geminiKey = readGeminiApiKey();
  if (geminiKey) {
    try {
      const parts: Array<
        | { text: string }
        | { inline_data: { mime_type: string; data: string } }
      > = [{ text: params.userPrompt }];

      if (params.imageDataUrl) {
        const parsedImg = parseDataUrl(params.imageDataUrl);
        if (parsedImg && parsedImg.base64.length < 4_500_000) {
          parts.push({
            inline_data: {
              mime_type: parsedImg.mimeType,
              data: parsedImg.base64,
            },
          });
        }
      }

      const geminiModels = await geminiModelsFor(
        geminiKey,
        power ? "power" : "fast",
      );

      for (const model of geminiModels.slice(0, maxGeminiModelsToTry())) {
        const result = await callGeminiGenerate({
          apiKey: geminiKey,
          model,
          body: {
            systemInstruction: {
              parts: [{ text: params.systemPrompt }],
            },
            contents: [{ role: "user", parts }],
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature: power ? 0.38 : 0.55,
              ...(params.jsonMode
                ? { responseMimeType: "application/json" }
                : {}),
            },
          },
        });

        if (result.ok && result.text) {
          return { provider: "gemini", text: result.text };
        }
        if (!result.ok && result.reason === "quota_or_rate_limit") {
          hitQuota = true;
          break;
        }
      }
    } catch {
      // Fall back to OpenAI (si autorisé) ou null
    }
  }

  if (hitQuota && !isOpenAiFallbackEnabled()) {
    return null;
  }

  const openaiKey = isOpenAiFallbackEnabled()
    ? process.env.OPENAI_API_KEY?.trim()
  : undefined;
  if (openaiKey) {
    try {
      const userContent:
        | string
        | Array<
            | { type: "text"; text: string }
            | { type: "image_url"; image_url: { url: string; detail: "low" } }
          > =
        params.imageDataUrl &&
        params.imageDataUrl.startsWith("data:image/") &&
        params.imageDataUrl.length < 4_500_000
          ? [
              { type: "text", text: params.userPrompt },
              {
                type: "image_url",
                image_url: { url: params.imageDataUrl, detail: "low" },
              },
            ]
          : params.userPrompt;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: power ? "gpt-4o" : "gpt-4o-mini",
          ...(params.jsonMode ? { response_format: { type: "json_object" } } : {}),
          messages: [
            { role: "system", content: params.systemPrompt },
            { role: "user", content: userContent },
          ],
          max_tokens: maxTokens,
          temperature: power ? 0.38 : 0.55,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) {
          return { provider: "openai", text };
        }
      }
    } catch {
      // local engine
    }
  }

  return null;
}