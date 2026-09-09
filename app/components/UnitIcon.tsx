import Image from "next/image";
import type { ReactNode } from "react";
import type { CatalogEntry } from "@/data/tft";
import ChampionHoverCard from "./ChampionHoverCard";
import CatalogHoverCard from "./CatalogHoverCard";

function wrapEntry(entry: CatalogEntry, icon: ReactNode) {
  if (entry.type === "英雄") return <ChampionHoverCard entry={entry}>{icon}</ChampionHoverCard>;
  return <CatalogHoverCard entry={entry}>{icon}</CatalogHoverCard>;
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
    return wrapEntry(entry, (
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

  return wrapEntry(entry, (
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
