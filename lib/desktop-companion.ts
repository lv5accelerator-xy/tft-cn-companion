export const DESKTOP_LAST_ROUTE_KEY = "tft-cn-companion-last-route-v1";

const RESTORABLE_PREFIXES = [
  "/opening",
  "/compare",
  "/focus",
  "/review",
  "/comps",
  "/champions",
  "/items",
  "/traits",
  "/augments",
  "/builder",
  "/stats",
  "/import",
];

export function isRestorableRoute(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/resume") || value.startsWith("/api/")) return false;
  const pathname = value.split("?")[0].split("#")[0];
  return RESTORABLE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
