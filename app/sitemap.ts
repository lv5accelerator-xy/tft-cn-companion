import type { MetadataRoute } from "next";

const routes = ["/", "/demo", "/opening", "/coach", "/compare", "/focus", "/review", "/insights", "/share", "/comps", "/champions", "/items", "/traits", "/augments", "/builder", "/stats"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map((route) => ({ url: `https://tft-cn-companion-web.vercel.app${route}`, lastModified, changeFrequency: route === "/" ? "daily" : "weekly", priority: route === "/" ? 1 : .7 }));
}
