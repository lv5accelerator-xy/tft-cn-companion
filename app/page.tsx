"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  componentNames,
  fallbackEntries,
  patchInfo,
  recipes as fallbackRecipes,
  type CatalogEntry,
  type Recipe,
  type TftCatalogPayload,
} from "@/data/tft";

const tabs = ["全部", "英雄", "装备", "羁绊", "阵容"] as const;
type Tab = (typeof tabs)[number];

type SavedComp = {
  id: string;
  name: string;
  championIds: string[];
};

const STORAGE_KEY = "tft-cn-companion-comps-v1";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

function EntryIcon({ entry }: { entry: CatalogEntry }) {
  if (!entry.imageUrl) {
    return <div className="entryIcon placeholder">{entry.nameZh.slice(0, 1)}</div>;
  }

  return (
    <div className="entryIcon">
      <Image
        src={entry.imageUrl}
        alt={entry.nameEn}
        width={48}
        height={48}
        unoptimized
      />
    </div>
  );
}

export default function HomePage() {
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "fallback">("loading");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("全部");
  const [compact, setCompact] = useState(false);
  const [componentA, setComponentA] = useState<string | null>(null);
  const [componentB, setComponentB] = useState<string | null>(null);
  const [selectedChampionIds, setSelectedChampionIds] = useState<string[]>([]);
  const [savedComps, setSavedComps] = useState<SavedComp[]>([]);
  const [compName, setCompName] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/tft")
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<TftCatalogPayload>;
      })
      .then((payload) => {
        if (cancelled) return;
        setCatalog(payload);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("fallback");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedComps(JSON.parse(raw) as SavedComp[]);
    } catch {
      // Ignore malformed browser storage and keep an empty planner.
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";

      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && query) {
        setQuery("");
        searchRef.current?.blur();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [query]);

  const entries = useMemo(() => {
    if (!catalog) return fallbackEntries;
    return [...catalog.champions, ...catalog.items, ...catalog.traits];
  }, [catalog]);

  const champions = useMemo(
    () => entries.filter((entry) => entry.type === "英雄"),
    [entries],
  );

  const items = useMemo(
    () => entries.filter((entry) => entry.type === "装备"),
    [entries],
  );

  const components = useMemo<CatalogEntry[]>(() => {
    if (catalog?.components.length) return catalog.components;
    return componentNames.map((name, index) => ({
      id: `fallback-component-${index}`,
      type: "装备",
      nameZh: name,
      nameEn: name,
      subtype: "component",
    }));
  }, [catalog]);

  const activeRecipes: Recipe[] = catalog?.recipes ?? fallbackRecipes;

  const recipeResult = useMemo(() => {
    if (!componentA || !componentB) return null;
    return activeRecipes.find(
      (recipe) =>
        (recipe.a === componentA && recipe.b === componentB) ||
        (recipe.a === componentB && recipe.b === componentA),
    ) ?? null;
  }, [activeRecipes, componentA, componentB]);

  const resultItem = useMemo(() => {
    if (!recipeResult) return null;
    return items.find((item) => normalize(item.nameEn) === normalize(recipeResult.result)) ?? null;
  }, [items, recipeResult]);

  const selectedChampions = useMemo(
    () => selectedChampionIds
      .map((id) => champions.find((champion) => champion.id === id))
      .filter((champion): champion is CatalogEntry => Boolean(champion)),
    [champions, selectedChampionIds],
  );

  const filtered = useMemo(() => {
    if (tab === "阵容") return [];
    const q = normalize(query);
    return entries.filter((entry) => {
      const tabMatch = tab === "全部" || entry.type === tab;
      if (!tabMatch) return false;
      if (!q) return true;
      const text = [entry.nameZh, entry.nameEn, entry.id, entry.tier?.toString() ?? ""]
        .join(" ")
        .toLocaleLowerCase("en-US");
      return text.includes(q);
    });
  }, [entries, query, tab]);

  const visibleSavedComps = useMemo(() => {
    const q = normalize(query);
    if (!q) return savedComps;
    return savedComps.filter((comp) => {
      const championNames = comp.championIds
        .map((id) => champions.find((champion) => champion.id === id))
        .flatMap((champion) => champion ? [champion.nameZh, champion.nameEn] : []);
      return normalize([comp.name, ...championNames].join(" ")).includes(q);
    });
  }, [champions, query, savedComps]);

  function pickComponent(name: string) {
    if (!componentA) {
      setComponentA(name);
      return;
    }
    if (!componentB) {
      setComponentB(name);
      return;
    }
    setComponentA(name);
    setComponentB(null);
  }

  function clearComponents() {
    setComponentA(null);
    setComponentB(null);
  }

  function toggleChampion(id: string) {
    setSelectedChampionIds((current) => {
      if (current.includes(id)) return current.filter((championId) => championId !== id);
      if (current.length >= 10) return current;
      return [...current, id];
    });
  }

  function persistComps(next: SavedComp[]) {
    setSavedComps(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function saveCurrentComp() {
    if (!selectedChampionIds.length) return;
    const fallbackName = `我的阵容 ${savedComps.length + 1}`;
    const nextComp: SavedComp = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`,
      name: compName.trim() || fallbackName,
      championIds: selectedChampionIds,
    };
    persistComps([nextComp, ...savedComps]);
    setCompName("");
  }

  function deleteComp(id: string) {
    persistComps(savedComps.filter((comp) => comp.id !== id));
  }

  function loadComp(comp: SavedComp) {
    setSelectedChampionIds(comp.championIds);
    setTab("英雄");
  }

  const sourceLine = loadState === "ready" && catalog
    ? `${catalog.source} · Data Dragon ${catalog.dataDragonVersion}`
    : loadState === "fallback"
      ? "离线回退数据 · 官方数据暂时未载入"
      : "正在同步 Riot 官方数据…";

  return (
    <main className={`shell ${compact ? "compact" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <div className="eyebrow">NA · 中文副屏助手</div>
          <h1>TFT CN Companion</h1>
          <p>美服英文界面 ↔ 中文名称 · 快速装备合成 · 阵容收藏</p>
        </div>
        <div className="headerActions">
          <button className="ghostButton" onClick={() => setCompact((value) => !value)}>
            {compact ? "标准模式" : "紧凑模式"}
          </button>
          <div className="patch">
            <strong>Patch {catalog?.tftPatch ?? patchInfo.patch}</strong>
            <span>{catalog?.set ?? patchInfo.set}</span>
          </div>
        </div>
      </header>

      <section className="statusBar">
        <span className={`statusDot ${loadState}`} />
        <span>{sourceLine}</span>
        {catalog && (
          <span className="statusCounts">
            {catalog.champions.length} 英雄 · {catalog.items.length} 装备 · {catalog.traits.length} 羁绊
          </span>
        )}
      </section>

      <section className="toolPanel itemBuilder">
        <div className="panelHeading">
          <div>
            <div className="eyebrow">装备合成器</div>
            <h2>点两个散件，立即看成装</h2>
          </div>
          <button className="ghostButton small" onClick={clearComponents}>清空</button>
        </div>

        <div className="componentRow">
          {components.map((component) => {
            const active = component.nameEn === componentA || component.nameEn === componentB;
            return (
              <button
                key={component.id}
                className={`componentButton ${active ? "selected" : ""}`}
                onClick={() => pickComponent(component.nameEn)}
                title={`${component.nameZh} / ${component.nameEn}`}
              >
                <EntryIcon entry={component} />
                <span>{component.nameZh}</span>
                <small>{component.nameEn}</small>
              </button>
            );
          })}
        </div>

        <div className="recipeStrip">
          <div className="recipeSlot">
            <strong>{componentA ?? "散件 1"}</strong>
          </div>
          <span className="plus">+</span>
          <div className="recipeSlot">
            <strong>{componentB ?? "散件 2"}</strong>
          </div>
          <span className="equals">=</span>
          <div className={`recipeResult ${recipeResult ? "ready" : ""}`}>
            {resultItem && <EntryIcon entry={resultItem} />}
            <div>
              <strong>{resultItem?.nameZh ?? recipeResult?.result ?? "选择两个散件"}</strong>
              <small>{resultItem?.nameEn ?? recipeResult?.result ?? "支持基础 8 散件的 36 种组合"}</small>
            </div>
          </div>
        </div>
      </section>

      <section className="plannerPanel toolPanel">
        <div className="panelHeading">
          <div>
            <div className="eyebrow">阵容规划器</div>
            <h2>开局前锁定你的目标阵容</h2>
          </div>
          <span className="counter">{selectedChampionIds.length}/10</span>
        </div>

        <div className="selectedUnits">
          {selectedChampions.length ? selectedChampions.map((champion) => (
            <button
              key={champion.id}
              className="selectedUnit"
              onClick={() => toggleChampion(champion.id)}
              title="点击移除"
            >
              <EntryIcon entry={champion} />
              <span>{champion.nameZh}</span>
            </button>
          )) : (
            <div className="plannerHint">在下面的英雄卡片点“加入规划”，最多保存 10 名英雄。</div>
          )}
        </div>

        <div className="saveRow">
          <input
            value={compName}
            onChange={(event) => setCompName(event.target.value)}
            placeholder="阵容名称，例如：永恒之森法系"
          />
          <button className="primaryButton" onClick={saveCurrentComp} disabled={!selectedChampionIds.length}>
            保存阵容
          </button>
          <button className="ghostButton" onClick={() => setSelectedChampionIds([])}>
            清空英雄
          </button>
        </div>
      </section>

      <div className="searchWrap">
        <input
          ref={searchRef}
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索英文或中文：Jinx / 金克丝 / Shojin / 朔极之矛…"
          aria-label="搜索 TFT 资料"
        />
        <kbd>/</kbd>
      </div>

      <nav className="tabs" aria-label="资料类型">
        {tabs.map((item) => (
          <button
            className={`tab ${tab === item ? "active" : ""}`}
            key={item}
            onClick={() => setTab(item)}
          >
            {item}
            {item === "阵容" && savedComps.length > 0 && <span className="tabCount">{savedComps.length}</span>}
          </button>
        ))}
      </nav>

      {tab === "阵容" ? (
        <section className="grid compGrid">
          {visibleSavedComps.map((comp) => (
            <article className="card compCard" key={comp.id}>
              <div className="cardTopline">
                <span className="typeBadge">阵容</span>
                <span className="muted">{comp.championIds.length} 名英雄</span>
              </div>
              <h3>{comp.name}</h3>
              <div className="miniUnits">
                {comp.championIds.map((id) => {
                  const champion = champions.find((unit) => unit.id === id);
                  return champion ? (
                    <div className="miniUnit" key={id} title={`${champion.nameZh} / ${champion.nameEn}`}>
                      <EntryIcon entry={champion} />
                      <span>{champion.nameZh}</span>
                    </div>
                  ) : null;
                })}
              </div>
              <div className="cardActions">
                <button className="primaryButton small" onClick={() => loadComp(comp)}>载入规划</button>
                <button className="ghostButton small danger" onClick={() => deleteComp(comp.id)}>删除</button>
              </div>
            </article>
          ))}
          {visibleSavedComps.length === 0 && (
            <div className="empty">还没有保存阵容。先从“英雄”标签里选择棋子并保存。</div>
          )}
        </section>
      ) : (
        <section className="grid">
          {filtered.map((entry) => {
            const selected = entry.type === "英雄" && selectedChampionIds.includes(entry.id);
            const entryRecipe = entry.type === "装备"
              ? activeRecipes.find((recipe) => normalize(recipe.result) === normalize(entry.nameEn))
              : undefined;

            return (
              <article className={`card entryCard ${selected ? "selectedCard" : ""}`} key={`${entry.type}-${entry.id}`}>
                <div className="entryMain">
                  <EntryIcon entry={entry} />
                  <div className="entryText">
                    <div className="cardTopline">
                      <span className="typeBadge">{entry.type}</span>
                      {entry.type === "英雄" && entry.tier && <span className="cost">{entry.tier}费</span>}
                      {entry.type === "装备" && entry.subtype === "component" && <span className="muted">散件</span>}
                    </div>
                    <h3>{entry.nameZh}</h3>
                    <div className="englishName">{entry.nameEn}</div>
                  </div>
                </div>

                {entryRecipe && (
                  <div className="recipeText">{entryRecipe.a} + {entryRecipe.b}</div>
                )}

                {entry.type === "英雄" && (
                  <button
                    className={`plannerButton ${selected ? "selected" : ""}`}
                    onClick={() => toggleChampion(entry.id)}
                  >
                    {selected ? "✓ 已加入规划" : "+ 加入规划"}
                  </button>
                )}
              </article>
            );
          })}
        </section>
      )}

      {tab !== "阵容" && filtered.length === 0 && (
        <div className="empty">没有找到匹配内容。可以尝试中文名、英文名或费用。</div>
      )}

      <footer className="footer">
        <strong>数据：</strong> Riot Data Dragon（NA） · TFT {catalog?.tftPatch ?? patchInfo.patch} · {catalog?.set ?? patchInfo.set}。
        本工具仅提供赛前已知的静态资料与个人阵容规划，不读取实时对局状态，不追踪对手棋盘。
      </footer>
    </main>
  );
}
