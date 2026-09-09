import StatSimulator from "./StatSimulator";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ champion?: string }>;
}) {
  const { champion = "" } = await searchParams;
  return <StatSimulator initialChampionId={champion} />;
}
