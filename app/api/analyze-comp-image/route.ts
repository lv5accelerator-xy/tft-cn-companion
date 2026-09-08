import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-5.6-luna";
const MAX_IMAGES = 3;
const MAX_TOTAL_IMAGE_CHARS = 3_800_000;

type RequestBody = {
  images?: string[];
  sourceId?: string;
  sourceName?: string;
  patch?: string;
};

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    model: MODEL,
    maxImages: MAX_IMAGES,
  });
}

function extractOutputText(payload: any) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  const texts: string[] = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === "string") texts.push(content.text);
    }
  }
  return texts.join("\n").trim();
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
  const prompt = `You extract Teamfight Tactics infographic data into JSON for a US-server TFT companion.\n\nSOURCE: ${sourceName}\nEXPECTED PATCH: ${patch}\n\nHard rules:\n1. This product is TFT-only. If the image is about 金铲铲之战 / Golden Spatula, set gameMode=GOLDEN_SPATULA and return comps=[]. Never translate Golden Spatula data into TFT.\n2. If it is clearly Teamfight Tactics / 云顶之弈, set gameMode=TFT. If uncertain, set UNKNOWN and explain why in warnings.\n3. One infographic may contain multiple comps. Extract every clearly supported comp, but never invent missing units, items, augments, positioning, tier or stage instructions.\n4. For unit strings used in coreUnits, flexUnits, board.unit and carries.unit, use the official US English champion name whenever identifiable. This lets the app match Riot Data Dragon IDs.\n5. board is the player's 4-row x 7-column TFT board. row 0 is the back row and row 3 is the front row. If exact hex placement cannot be determined, return board=[] and add a warning instead of guessing.\n6. Use itemFocus entries such as \"Twisted Fate: Guinsoo's Rageblade / Jeweled Gauntlet\" when the image clearly assigns items to a unit.\n7. Preserve visible comp codes beginning with TFTSet when present.\n8. confidence is extraction confidence from 0 to 1. Low-confidence icon-only reads must be listed in warnings.\n9. Output JSON only and follow the supplied schema.`;

  const content = [
    { type: "input_text", text: prompt },
    ...images.map((image) => ({ type: "input_image", image_url: image, detail: "high" as const })),
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
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
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const message = payload?.error?.message || `OpenAI API request failed with HTTP ${response.status}.`;
      return NextResponse.json({ error: message }, { status: 502 });
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      return NextResponse.json({ error: "Vision model returned no structured output." }, { status: 502 });
    }

    const result = JSON.parse(outputText);
    return NextResponse.json({ result, model: MODEL });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Image analysis failed." },
      { status: 500 },
    );
  }
}
