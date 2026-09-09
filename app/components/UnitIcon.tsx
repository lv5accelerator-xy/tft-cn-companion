import Image from "next/image";
import type { ReactNode } from "react";
import type { CatalogEntry } from "@/data/tft";
import ChampionHoverCard from "./ChampionHoverCard";

function wrapChampion(entry: CatalogEntry, icon: ReactNode) {
  return entry.type === "英雄" ? <ChampionHoverCard entry={entry}>{icon}</ChampionHoverCard> : icon;
}

export default function UnitIcon({
  entry,
  size = 42,
  className = "",
}: {
  entry: CatalogEntry;
  size?: number;
  className?: string;
}) {
  if (!entry.imageUrl) {
    return wrapChampion(entry, (
      <span
        className={className}
        style={{
          width: size,
          height: size,
          display: "grid",
          placeItems: "center",
          borderRadius: 8,
          background: "#2a2c33",
          color: "#dfe3ea",
          fontWeight: 800,
          flex: "0 0 auto",
        }}
      >
        {entry.nameZh.slice(0, 1)}
      </span>
    ));
  }

  return wrapChampion(entry, (
    <Image
      className={className}
      src={entry.imageUrl}
      alt={entry.nameEn}
      width={size}
      height={size}
      unoptimized
      style={{ borderRadius: 8, objectFit: "cover", flex: "0 0 auto" }}
    />
  ));
}
