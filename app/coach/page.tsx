"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { metaComps, type UnifiedMetaComp } from "@/data/meta";
import type { TftCatalogPayload } from "@/data/tft";
import { rankOpeningComps } from "@/lib/opening-assistant";
import { parseOpeningSession, type OpeningSession } from "@/lib/opening-session";
import { readPreferences, type UserPreferences } from "@/lib/preferences";
import { parseReviewHistory, type ReviewRecord } from "@/lib/review";
import { buildSmartGuidance } from "@/lib/smart-guidance";
import { FOCUS_TRAY_KEY, LOCAL_IMPORT_KEY, OPENING_SESSION_KEY, REVIEW_HISTORY_KEY, markWorkspaceChanged } from "@/lib/workspace";
import { useLocale } from "../components/LocaleProvider";
import styles from "./coach.module.css";

function isManualComp(value: unknown): value is UnifiedMetaComp {
  if (!value || typeof value !== "object") return false;
  const comp = value as Partial<UnifiedMetaComp>;
  return comp.gameMode === "TFT" && comp.syncOrigin === "manual" && typeof comp.id === "string" && typeof comp.sourceId === "string" && Array.isArray(comp.coreUnits) && Array.isArray(comp.board);
}

export default function CoachPage() {
  const { locale, tr, nameOf } = useLocale();
  const [catalog, setCatalog] = useState<TftCatalogPayload | null>(null);
  const [localComps, setLocalComps] = useState<UnifiedMetaComp[]>([]);
  const [opening, setOpening] = useState<OpeningSession>({ championPicks: [], componentPicks: [], updatedAt: 0 });
  const [history, setHistory] = useState<ReviewRecord[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/tft").then((response) => response.ok ? response.json() as Promise<TftCatalogPayload> : Promise.reject()).then(setCatalog).catch(() => setCatalog(null));
    try {
      const imported = JSON.parse(window.localStorage.getItem(LOCAL_IMPORT_KEY) || "[]") as unknown[];
      setLocalComps(imported.filter(isManualComp));
      setOpening(parseOpeningSession(JSON.parse(window.localStorage.getItem(OPENING_SESSION_KEY) || "null") as unknown));
      setHistory(parseReviewHistory(JSON.parse(window.localStorage.getItem(REVIEW_HISTORY_KEY) || "[]") as unknown));
      setPreferences(readPreferences(window.localStorage));
    } catch {
      setLocalComps([]);
      setPreferences(readPreferences(null));
    }
  }, []);

  const allComps = useMemo(() => {
    const seen = new Set<string>();
    return [...localComps, ...metaComps].filter((comp) => {
      const key = `${comp.sourceId}:${comp.id}:${comp.patch}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [localComps]);
  const champions = catalog?.champions ?? [];
  const items = catalog?.items ?? [];
  const recipes = catalog?.recipes ?? [];
  const hasOpeningSignals = opening.championPicks.length > 0 || opening.componentPicks.length > 0;
  const baseMatches = useMemo(() => catalog && hasOpeningSignals ? rankOpeningComps({ comps: allComps, champions, items, recipes, championPicks: opening.championPicks, componentPicks: opening.componentPicks }) : [], [allComps, catalog, champions, hasOpeningSignals, items, opening.championPicks, opening.componentPicks, recipes]);
  const guidance = useMemo(() => preferences ? buildSmartGuidance(baseMatches, history, preferences, locale).slice(0, 5) : [], [baseMatches, history, locale, preferences]);

  function pinTopThree(goCompare: boolean) {
    const next = [0, 1, 2].map((index) => guidance[index] ? { sourceId: guidance[index].comp.sourceId, id: guidance[index].comp.id } : null);
    try {
      window.localStorage.setItem(FOCUS_TRAY_KEY, JSON.stringify(next));
      markWorkspaceChanged();
      if (goCompare) window.location.assign("/compare");
      else setMessage(tr("已把智能指导 Top 3 写入候选夹。", "Smart Guidance Top 3 saved to the candidate tray."));
    } catch {
      setMessage(tr("候选夹保存失败，请检查浏览器本地存储权限。", "Could not save the candidate tray; check local storage permissions."));
    }
  }

  if (!catalog || !preferences) return <div className={styles.empty}><strong>{tr("正在准备智能指导…", "Preparing Smart Guidance…")}</strong></div>;
  if (!hasOpeningSignals) return <div className={styles.empty}><span>V1.6 · SMART GUIDANCE</span><h1>{tr("先告诉我你的开局资源", "Start with your opening resources")}</h1><p>{tr("智能指导不会读取客户端或对手信息。先在开局助手选择你实际拥有的英雄和散件，再回来查看可解释的个性化排序。", "Smart Guidance does not read the client or opponent data. Enter the units and components you actually have in Opening Assistant, then return for explainable personalized ranking.")}</p><Link href="/opening">{tr("打开开局助手", "Open Opening Assistant")}</Link></div>;

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><span>V1.6 · SMART GUIDANCE</span><h1>{tr("可解释智能指导", "Explainable Smart Guidance")}</h1><p>{tr("在原有开局资源匹配分上，只加入你主动设置的偏好和你自己的赛后样本。不会读取实时对手、隐藏信息，也不会替你自动操作。", "Adds only your explicit preferences and your own review sample on top of opening-resource fit. No live opponent scouting, hidden information or automated play.")}</p></div>
        <div><Link href="/opening">{tr("修改开局资源", "Edit opening")}</Link><Link href="/preferences">{tr("修改偏好", "Preferences")}</Link><button onClick={() => pinTopThree(false)}>Top 3 → Tray</button><button className={styles.primary} onClick={() => pinTopThree(true)}>Top 3 → Compare</button></div>
      </header>

      <section className={styles.contextBar}>
        <div><span>{tr("开局输入", "Opening input")}</span><strong>{opening.championPicks.reduce((sum, pick) => sum + pick.count, 0)} {tr("张英雄", "unit copies")} · {opening.componentPicks.reduce((sum, pick) => sum + pick.count, 0)} {tr("个散件", "components")}</strong></div>
        <div><span>{tr("个人样本", "Personal sample")}</span><strong>{history.length} {tr("局复盘", "reviews")}</strong></div>
        <div><span>{tr("偏好", "Preference")}</span><strong>{preferences.tempo.toUpperCase()} · {preferences.risk.toUpperCase()} · {preferences.goal.toUpperCase()}</strong></div>
        <div><span>{tr("计算原则", "Principle")}</span><strong>{tr("资源匹配优先，个性化只做轻量修正", "Resource fit first; personalization is a small adjustment")}</strong></div>
      </section>

      {message ? <div className={styles.message}>{message}</div> : null}

      <section className={styles.results}>
        {guidance.map((match, index) => {
          const adjustment = match.preferenceAdjustment + match.familiarityAdjustment;
          return <article className={`${styles.card} ${index === 0 ? styles.best : ""}`} key={`${match.comp.sourceId}:${match.comp.id}`}>
            <div className={styles.rank}>#{index + 1}</div>
            <div className={styles.score}><strong>{match.guidanceScore}</strong><span>GUIDANCE</span><small>{tr("资源", "base")} {match.score} {adjustment ? `${adjustment > 0 ? "+" : ""}${adjustment}` : "±0"}</small></div>
            <div className={styles.body}>
              <div className={styles.title}><div><h2>{locale === "zh" ? match.comp.nameZh : match.comp.name}</h2><p>{match.comp.source} · {match.comp.playstyle} · Tier {match.comp.tier}</p></div><span>{match.comp.difficulty}</span></div>
              <div className={styles.metrics}><div><span>{tr("英雄匹配", "Units")}</span><strong>{match.unitScore}</strong></div><div><span>{tr("装备匹配", "Items")}</span><strong>{match.itemScore}</strong></div><div><span>Meta</span><strong>{match.metaScore}</strong></div><div><span>{tr("个人修正", "Personal")}</span><strong>{adjustment > 0 ? `+${adjustment}` : adjustment}</strong></div></div>
              <div className={styles.explain}><div><span>{tr("为什么适合", "Why it fits")}</span><ul>{match.reasons.length ? match.reasons.slice(0, 4).map((reason) => <li key={reason}>{reason}</li>) : <li>{tr("当前主要来自基础资源匹配。", "Currently driven mainly by base resource fit.")}</li>}</ul></div><div><span>{tr("需要注意", "Watch-outs")}</span><ul>{match.cautions.length ? match.cautions.slice(0, 3).map((caution) => <li key={caution}>{caution}</li>) : <li>{tr("当前没有额外个性化警示。", "No extra personalized caution for this candidate.")}</li>}</ul></div></div>
              {match.craftableItemMatches.length ? <div className={styles.items}><span>{tr("可合成命中", "Craftable hits")}</span><strong>{match.craftableItemMatches.slice(0, 4).map(nameOf).join(" · ")}</strong></div> : null}
            </div>
            <div className={styles.actions}><Link href={`/focus?source=${encodeURIComponent(match.comp.sourceId)}&id=${encodeURIComponent(match.comp.id)}`}>◉ Focus</Link></div>
          </article>;
        })}
      </section>

      <footer><span>{tr("智能指导是静态、可解释的辅助排序。最终选择仍由你根据实际对局判断。", "Smart Guidance is static, explainable ranking support. Final decisions remain yours based on the actual game.")}</span><Link href="/insights">{tr("查看个人洞察", "Review personal insights")}</Link></footer>
    </div>
  );
}
