"use client";

import { useMemo, useState } from "react";
import { entries, patchInfo, type EntryType } from "@/data/tft";

const tabs: Array<"全部" | EntryType> = ["全部", "阵容", "英雄", "装备", "羁绊"];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<(typeof tabs)[number]>("全部");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const tabMatch = tab === "全部" || entry.type === tab;
      const text = [entry.nameZh, entry.nameEn, entry.summary, ...entry.tags].join(" ").toLowerCase();
      return tabMatch && (!q || text.includes(q));
    });
  }, [query, tab]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>TFT CN Companion</h1>
          <p>美服云顶之弈中文副屏助手 · 中英对照 · 快速查询</p>
        </div>
        <div className="patch">
          <strong>{patchInfo.patch}</strong> · {patchInfo.set}
        </div>
      </header>

      <input
        className="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="搜索 Jinx / 金克丝 / Shojin / 朔极之矛 / 暴风大剑…"
        aria-label="搜索 TFT 资料"
      />

      <nav className="tabs" aria-label="资料类型">
        {tabs.map((item) => (
          <button
            className={`tab ${tab === item ? "active" : ""}`}
            key={item}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      <section className="grid">
        {filtered.map((entry) => (
          <article className="card" key={`${entry.type}-${entry.nameEn}`}>
            <div className="muted">{entry.type}</div>
            <h3>{entry.nameZh}</h3>
            <div className="muted">{entry.nameEn}</div>
            <p>{entry.summary}</p>
            <div>
              {entry.tags.map((tag) => (
                <span className="tag" key={tag}>{tag}</span>
              ))}
            </div>
          </article>
        ))}
      </section>

      {filtered.length === 0 && (
        <div className="empty">没有找到匹配内容。可以尝试中文名、英文名、装备散件或关键词。</div>
      )}

      <h2 className="sectionTitle">下一阶段</h2>
      <section className="grid">
        <article className="card">
          <h3>完整版本数据库</h3>
          <p className="muted">自动同步 Set 18 英雄、装备、羁绊，并建立中英名称映射。</p>
        </article>
        <article className="card">
          <h3>阵容规划器</h3>
          <p className="muted">收藏 2–4 套阵容，局内只显示相关留牌、装备与运营节点。</p>
        </article>
        <article className="card">
          <h3>AI Coach</h3>
          <p className="muted">预留截图/VOD复盘入口；实时模式保持在 Riot 允许的静态参考边界内。</p>
        </article>
      </section>

      <footer className="footer">
        数据版本标记：{patchInfo.updated}。本项目为非官方 TFT 辅助项目，与 Riot Games 无隶属关系。
      </footer>
    </main>
  );
}
