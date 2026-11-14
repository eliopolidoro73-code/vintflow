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

export async function callCloudAi(params: {
  systemPrompt: string;
  userPrompt: string;
  imageDataUrl?: string;
  jsonMode?: boolean;
  maxTokens?: number;
}): Promise<AiCallResult | null> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
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

      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": geminiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: params.systemPrompt }],
            },
            contents: [{ role: "user", parts }],
            generationConfig: {
              maxOutputTokens: params.maxTokens ?? 400,
              ...(params.jsonMode
                ? { responseMimeType: "application/json" }
                : {}),
            },
          }),
        },
      );

      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          return { provider: "gemini", text };
        }
      }
    } catch {
      // Fall back to OpenAI or local engine
    }
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
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
          model: "gpt-4o-mini",
          ...(params.jsonMode ? { response_format: { type: "json_object" } } : {}),
          messages: [
            { role: "system", content: params.systemPrompt },
            { role: "user", content: userContent },
          ],
          max_tokens: params.maxTokens ?? 400,
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
      // Fall back to local engine
    }
  }

  return null;
}
