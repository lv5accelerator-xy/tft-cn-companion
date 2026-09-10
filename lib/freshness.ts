export type Freshness = {
  label: string;
  stale: boolean;
  ageDays: number | null;
};

export function formatFreshness(value: string, locale: "zh" | "en", now = Date.now()): Freshness {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return { label: value || "—", stale: false, ageDays: null };
  const diff = Math.max(0, now - timestamp);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  let label: string;
  if (hours < 1) label = locale === "zh" ? "刚刚更新" : "Updated just now";
  else if (hours < 24) label = locale === "zh" ? `${hours} 小时前` : `${hours}h ago`;
  else if (days < 14) label = locale === "zh" ? `${days} 天前` : `${days}d ago`;
  else label = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-CA", { month: "short", day: "numeric" }).format(new Date(timestamp));
  return { label, stale: days >= 14, ageDays: days };
}
