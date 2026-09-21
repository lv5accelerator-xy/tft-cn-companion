export function patchPageQuery(current: string, changes: Record<string, string | null>) {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "" || (value === "all" && (key === "source" || key === "tier"))) params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function updatePageQuery(changes: Record<string, string | null>, replace = false) {
  const url = window.location.pathname + patchPageQuery(window.location.search, changes);
  if (url === window.location.pathname + window.location.search) return;
  // Next.js integrates native History updates with useSearchParams.
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}

export function snapshotAge(capturedAt: string, now: number) {
  const captured = Date.parse(capturedAt);
  if (!Number.isFinite(captured) || captured > now) return null;
  const hours = Math.floor((now - captured) / 3_600_000);
  return { hours, days: Math.floor(hours / 24), needsReview: hours >= 48 };
}
