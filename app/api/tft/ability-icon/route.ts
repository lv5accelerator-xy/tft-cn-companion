import { NextRequest } from "next/server";

const CDRAGON = "https://raw.communitydragon.org/latest";
const TFT_ACADEMY = "https://assets.tftacademy.com/champions/champion_abilities";

const abilityKeyAliases: Record<string, string> = {
  aurelionsol: "AurelionSol",
  chogath: "ChoGath",
  jarvaniv: "JarvanIV",
  khazix: "KhaZix",
  kogmaw: "KogMaw",
  leblanc: "LeBlanc",
  leesin: "LeeSin",
  masteryi: "MasterYi",
  missfortune: "MissFortune",
  nunuwillump: "NunuWillump",
  reksai: "RekSai",
  tahmkench: "TahmKench",
  twistedfate: "TwistedFate",
  xinzhao: "XinZhao",
  sentry: "Pebbles",
};

function academyAbilityKey(apiName: string) {
  let value = apiName.trim()
    .replace(/^TFTSET18[_-]/i, "")
    .replace(/^TFT18[_-]/i, "")
    .replace(/^DA_18_/i, "")
    .replace(/^DA_/i, "");

  // Some Set 18 form IDs use both a trailing set number and an AD/AP suffix.
  for (let index = 0; index < 2; index += 1) {
    value = value.replace(/_(?:AD|AP)$/i, "").replace(/18$/i, "");
  }

  const compact = value.replace(/[^A-Za-z0-9]/g, "");
  if (!compact) return undefined;
  return abilityKeyAliases[compact.toLocaleLowerCase("en-US")] ?? compact;
}

function cdragonAbilityUrl(source: string | null) {
  if (!source) return undefined;
  const normalized = source
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .toLocaleLowerCase("en-US")
    .replace(/\.tex$/i, ".png")
    .replace(/\.dds$/i, ".png");

  // Only proxy game asset paths supplied by CommunityDragon; never proxy arbitrary URLs.
  if (!/^(?:assets|icons)\//.test(normalized)) return undefined;
  return `${CDRAGON}/game/${normalized}`;
}

async function fetchImage(url: string) {
  try {
    const response = await fetch(url, {
      next: { revalidate: 86400 },
      headers: {
        Accept: "image/avif,image/webp,image/png,image/*,*/*;q=0.8",
        "User-Agent": "TFT-CN-Companion/1.1",
      },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;
    return {
      body: await response.arrayBuffer(),
      contentType,
    };
  } catch {
    return null;
  }
}

function placeholder() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="#252832"/><path d="M32 12l4.8 14.7L52 32l-15.2 5.3L32 52l-4.8-14.7L12 32l15.2-5.3L32 12z" fill="#bdb0ff"/></svg>`;
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

export async function GET(request: NextRequest) {
  const apiName = request.nextUrl.searchParams.get("champion")?.trim() || "";
  const source = request.nextUrl.searchParams.get("source");

  if (!/^[A-Za-z0-9_-]{2,80}$/.test(apiName)) return placeholder();

  const candidates: string[] = [];
  const academyKey = academyAbilityKey(apiName);
  if (academyKey) {
    candidates.push(`${TFT_ACADEMY}/TFT18_${encodeURIComponent(academyKey)}.webp`);
  }

  const cdragonUrl = cdragonAbilityUrl(source);
  if (cdragonUrl) candidates.push(cdragonUrl);

  for (const candidate of candidates) {
    const image = await fetchImage(candidate);
    if (!image) continue;
    return new Response(image.body, {
      status: 200,
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  }

  return placeholder();
}
