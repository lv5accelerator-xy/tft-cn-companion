import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    version: "1.0.0",
    release: "TFT CN Companion V1.0",
    patch: "18.1",
    set: "18",
    region: "NA",
    tftOnly: true,
    imageAnalyzer: Boolean(process.env.OPENAI_API_KEY),
    cloudSync: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    features: {
      builderPro: true,
      editableBoard: true,
      championItems: true,
      liveTraits: true,
      bilingual: true,
      infographicImport: true,
      cloudWorkspace: true,
    },
  });
}
