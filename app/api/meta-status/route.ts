import { NextResponse } from "next/server";
import { liveMetaSnapshot } from "@/data/live-meta";
import { metaSources, tftOnlyPolicy } from "@/data/meta-sources";
import { compsForSource } from "@/data/meta";
import { rankingSources, rankingSnapshot, rankingEntries } from "@/data/rankings";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    generatedAt: [liveMetaSnapshot.generatedAt, rankingSnapshot.capturedAt].sort().at(-1),
    policy: {
      game: tftOnlyPolicy.game,
      blockedSignals: tftOnlyPolicy.blockedSignals,
    },
    totals: {
      articles: liveMetaSnapshot.articles.length,
      liveComps: liveMetaSnapshot.records.length,
      rankingEntries: rankingEntries.length,
    },
    sources: metaSources.map((source) => {
      const state = liveMetaSnapshot.sourceStates.find((entry) => entry.sourceId === source.id);
      const ranking = rankingSources.find((entry) => entry.id === source.id);
      return {
        id: source.id,
        name: source.name,
        channel: source.channel,
        game: source.game,
        status: ranking ? "curated" : state?.status ?? "awaiting_feed",
        lastCheckedAt: ranking ? rankingSnapshot.capturedAt : state?.lastCheckedAt ?? null,
        lastChangedAt: ranking ? null : state?.lastChangedAt ?? null,
        message: ranking ? `已核验静态榜单快照；${ranking.scope}` : state?.message ?? "等待同步状态",
        rankingCount: ranking?.recordCount ?? 0,
        rankingPatch: ranking?.patch ?? null,
        sourceUpdatedAt: ranking?.sourceUpdatedAt ?? null,
        sourceUpdatedLabel: ranking?.sourceUpdatedLabel ?? null,
        compCount: compsForSource(source.id).length,
        articleCount: liveMetaSnapshot.articles.filter((article) => article.sourceId === source.id).length,
      };
    }),
  });
}
