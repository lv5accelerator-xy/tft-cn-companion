import { NextResponse } from "next/server";
import { liveMetaSnapshot } from "@/data/live-meta";
import { metaSources, tftOnlyPolicy } from "@/data/meta-sources";
import { compsForSource } from "@/data/meta";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    generatedAt: liveMetaSnapshot.generatedAt,
    policy: {
      game: tftOnlyPolicy.game,
      blockedSignals: tftOnlyPolicy.blockedSignals,
    },
    totals: {
      articles: liveMetaSnapshot.articles.length,
      liveComps: liveMetaSnapshot.records.length,
    },
    sources: metaSources.map((source) => {
      const state = liveMetaSnapshot.sourceStates.find((entry) => entry.sourceId === source.id);
      return {
        id: source.id,
        name: source.name,
        channel: source.channel,
        game: source.game,
        status: state?.status ?? "awaiting_feed",
        lastCheckedAt: state?.lastCheckedAt ?? null,
        lastChangedAt: state?.lastChangedAt ?? null,
        message: state?.message ?? "等待同步状态",
        compCount: compsForSource(source.id).length,
        articleCount: liveMetaSnapshot.articles.filter((article) => article.sourceId === source.id).length,
      };
    }),
  });
}
