import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-5.6-luna";
const FALLBACK_MODEL = process.env.OPENAI_VISION_FALLBACK_MODEL?.trim() || "gpt-5.6-terra";
const MAX_IMAGES = 3;
const MAX_TOTAL_IMAGE_CHARS = 3_800_000;

type RequestBody = {
  images?: string[];
  sourceId?: string;
  sourceName?: string;
  patch?: string;
};

type OpenAIResponse = {
  id?: string;
  status?: string;
  error?: { message?: string } | null;
  incomplete_details?: { reason?: string } | null;
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
};

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    model: MODEL,
    fallbackModel: FALLBACK_MODEL,
    maxImages: MAX_IMAGES,
  });
}

function extractOutputText(payload: OpenAIResponse) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  for (const item of payload.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string" && content.text.trim()) {
        return content.text.trim();
      }
    }
  }

  return "";
}

function extractRefusal(payload: OpenAIResponse) {
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "refusal" && typeof content.refusal === "string" && content.refusal.trim()) {
        return content.refusal.trim();
      }
    }
  }
  return "";
}

function parseStructuredOutput(payload: OpenAIResponse) {
  if (payload.error?.message) {
    throw new Error(payload.error.message);
  }
  if (payload.status === "failed" || payload.status === "cancelled") {
    throw new Error("AI 图片分析未完成，请重试。 ");
  }
  if (payload.status === "incomplete") {
    throw new Error(`AI 图片分析输出不完整${payload.incomplete_details?.reason ? `：${payload.incomplete_details.reason}` : ""}。`);
  }

  const refusal = extractRefusal(payload);
  if (refusal) {
    throw new Error(`AI 无法处理这张图片：${refusal}`);
  }

  let outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error("AI 没有返回可用的结构化结果。 ");
  }

  // json_schema 正常情况下不会包含 Markdown fence；这里仅作为上游异常兜底。
  outputText = outputText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(outputText);
  } catch {
    const preview = outputText.replace(/\s+/g, " ").slice(0, 160);
    throw new Error(`AI 返回了非结构化内容${preview ? `（${preview}）` : ""}`);
  }
}

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["gameMode", "sourceName", "patch", "articleTitle", "summary", "warnings", "comps"],
  properties: {
    gameMode: { type: "string", enum: ["TFT", "GOLDEN_SPATULA", "UNKNOWN"] },
    sourceName: { type: "string" },
    patch: { type: "string" },
    articleTitle: { type: "string" },
    summary: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
    comps: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "nameZh", "nameEn", "tier", "playstyle", "difficulty", "coreUnits", "flexUnits",
          "itemFocus", "traits", "augments", "whenToPlay", "keyNotes", "stages", "board",
          "positioningNote", "compCode", "carries", "confidence", "warnings"
        ],
        properties: {
          nameZh: { type: "string" },
          nameEn: { type: "string" },
          tier: { type: "string", enum: ["S", "A", "B", "ACTIVE"] },
          playstyle: { type: "string" },
          difficulty: { type: "string", enum: ["EASY", "MEDIUM", "HARD"] },
          coreUnits: { type: "array", items: { type: "string" } },
          flexUnits: { type: "array", items: { type: "string" } },
          itemFocus: { type: "array", items: { type: "string" } },
          traits: { type: "array", items: { type: "string" } },
          augments: { type: "array", items: { type: "string" } },
          whenToPlay: { type: "string" },
          keyNotes: { type: "array", items: { type: "string" } },
          stages: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["stage", "text"],
              properties: {
                stage: { type: "string", enum: ["Stage 2", "Stage 3", "Stage 4"] },
                text: { type: "string" }
              }
            }
          },
          board: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["unit", "row", "col"],
              properties: {
                unit: { type: "string" },
                row: { type: "integer", minimum: 0, maximum: 3 },
                col: { type: "integer", minimum: 0, maximum: 6 }
              }
            }
          },
          positioningNote: { type: "string" },
          compCode: { type: "string" },
          carries: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["unit", "role", "items", "alternatives"],
              properties: {
                unit: { type: "string" },
                role: { type: "string", enum: ["CARRY", "TANK", "SECONDARY"] },
                items: { type: "array", items: { type: "string" } },
                alternatives: { type: "array", items: { type: "string" } }
              }
            }
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          warnings: { type: "array", items: { type: "string" } }
        }
      }
    }
  }
} as const;

async function callOpenAI(
  apiKey: string,
  model: string,
  content: Array<Record<string, unknown>>,
) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content }],
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "tft_comp_infographic",
          strict: true,
          schema,
        },
      },
      store: false,
    }),
  });

  let payload: OpenAIResponse;
  try {
    payload = await response.json() as OpenAIResponse;
  } catch {
    throw new Error(`OpenAI API 返回了无法解析的响应（HTTP ${response.status}）。`);
  }

  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI API 请求失败（HTTP ${response.status}）。`);
  }

  return { payload, model };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Image analysis is not configured. Add OPENAI_API_KEY to the Vercel project environment variables." },
      { status: 503 },
    );
  }

  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const images = Array.isArray(body.images) ? body.images.filter((value) => typeof value === "string") : [];
  if (!images.length || images.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Upload between 1 and ${MAX_IMAGES} images.` }, { status: 400 });
  }
  if (images.some((image) => !/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image))) {
    return NextResponse.json({ error: "Only JPEG, PNG and WebP image data is supported." }, { status: 400 });
  }
  if (images.reduce((sum, image) => sum + image.length, 0) > MAX_TOTAL_IMAGE_CHARS) {
    return NextResponse.json({ error: "Images are still too large after compression. Upload fewer images or crop them." }, { status: 413 });
  }

  const sourceName = body.sourceName?.trim() || "Unknown source";
  const patch = body.patch?.trim() || "18.1";
  const prompt = `You extract Teamfight Tactics infographic data into JSON for a US-server TFT companion. The current product UI is Simplified Chinese, but unit identities are stored with canonical US English champion names so the UI can switch languages later.\n\nSOURCE: ${sourceName}\nEXPECTED PATCH: ${patch}\n\nHard rules:\n1. This product is TFT-only. If the image is about 金铲铲之战 / Golden Spatula, set gameMode=GOLDEN_SPATULA and return comps=[]. Never translate Golden Spatula data into TFT.\n2. If it is clearly Teamfight Tactics / 云顶之弈, set gameMode=TFT. If uncertain, set UNKNOWN and explain why in warnings.\n3. One infographic may contain multiple comps. Extract every clearly supported comp, but never invent missing units, items, augments, positioning, tier or stage instructions.\n4. Chinese TFT infographics are expected. For coreUnits, flexUnits, board.unit and carries.unit, identify the Chinese label or portrait first, then return the official US English champion name whenever the identity is confident. Cross-reference the clearer lineup banner, carry panel and labeled roster in the same image to identify small board portraits.\n5. Board coordinates are the player's 4-row x 7-column board. row 0 = FRONT ROW closest to the enemy; row 3 = BACK ROW closest to the player's bench. In common Chinese one-sheet diagrams, the top visible hex row should normally map to row 0 and the bottom visible row to row 3. Within each row, col 0..6 are the seven hexes from LEFT to RIGHT, even though alternating hex rows are horizontally staggered.\n6. Do partial board extraction. If some occupied hexes are uncertain, return every confidently identified board position and add warnings for the unresolved cells. Do NOT return board=[] merely because one or two units or columns are uncertain. Only return board=[] when no board placement can be read reliably at all.\n7. When a board shows Chinese names directly on the unit hexes, use those labels first. When labels are tiny, match the portrait/icon against the lineup banner and carry list before giving up.\n8. Use itemFocus entries such as \"Draven: Guinsoo's Rageblade / Jeweled Gauntlet\" when the image clearly assigns items to a unit.\n9. Preserve visible comp codes beginning with TFTSet when present.\n10. confidence is extraction confidence from 0 to 1. Low-confidence icon-only reads must be listed in warnings, but low confidence on one unit must not erase otherwise readable positions.\n11. Use Simplified Chinese for explanatory prose fields such as summary, warnings, playstyle, whenToPlay, keyNotes, stage text and positioningNote. nameZh should be Chinese and nameEn should be English.\n12. Output JSON only and follow the supplied schema.`;

  const content: Array<Record<string, unknown>> = [
    { type: "input_text", text: prompt },
    ...images.map((image) => ({ type: "input_image", image_url: image, detail: "high" })),
  ];

  const attempts = Array.from(new Set([MODEL, FALLBACK_MODEL]));
  let lastError: Error | null = null;

  for (const model of attempts) {
    try {
      const { payload } = await callOpenAI(apiKey, model, content);
      const result = parseStructuredOutput(payload);
      return NextResponse.json({ result, model });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Image analysis failed.");
    }
  }

  return NextResponse.json(
    {
      error: `AI 图片分析暂时失败，请重新点击“AI 分析图片”再试一次。${lastError?.message ? ` 详情：${lastError.message}` : ""}`,
    },
    { status: 502 },
  );
}
