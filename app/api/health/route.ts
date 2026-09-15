import { NextResponse } from "next/server";
import { metaComps, metaPatch, metaUpdatedAt } from "@/data/meta";

export const dynamic = "force-dynamic";

export function GET() {
  const release = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || process.env.VERCEL_DEPLOYMENT_ID || "local";
  return NextResponse.json(
    { status: "ok", app: "tft-cn-companion", version: "1.6.6", release, patch: metaPatch, metaUpdatedAt, compCount: metaComps.length, timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
