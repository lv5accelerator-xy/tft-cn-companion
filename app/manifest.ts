import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TFT CN Companion",
    short_name: "TFT Companion",
    description: "美服云顶之弈中文副屏助手 / NA Teamfight Tactics second-screen companion",
    start_url: "/resume?source=pwa",
    display: "standalone",
    background_color: "#080b12",
    theme_color: "#080b12",
    orientation: "landscape",
    icons: [
      { src: "/tft-companion.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/tft-companion.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
