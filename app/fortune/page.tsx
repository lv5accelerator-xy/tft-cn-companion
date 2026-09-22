"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { groupCompGuides } from "@/data/rankings";
import { metaComps, type UnifiedMetaComp } from "@/data/meta";
import { useLocale } from "../components/LocaleProvider";
import styles from "./fortune.module.css";

const PROFILE_KEY = "tft-cn-companion-daily-fortune-profile-v1";

type FortuneStyle = "tempo" | "reroll" | "flex";
type FortuneLevel = {
  zh: string;
  en: string;
  tone: "great" | "good" | "steady" | "careful";
};

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function seededNumber(seed: number, salt: string, min: number, max: number) {
  const value = hashText(seed + ":" + salt) / 0xffffffff;
  return Math.round(min + value * (max - min));
}

function fortuneLevel(score: number): FortuneLevel {
  if (score >= 84) return { zh: "冲分吉日", en: "Prime ranked day", tone: "great" };
  if (score >= 70) return { zh: "稳健可打", en: "Good to queue", tone: "good" };
  if (score >= 55) return { zh: "娱乐优先", en: "Play for fun", tone: "steady" };
  return { zh: "谨慎开排", en: "Queue carefully", tone: "careful" };
}

function styleLabel(style: FortuneStyle, locale: "zh" | "en") {
  if (style === "tempo") return locale === "zh" ? "高节奏 / Fast 8–9" : "High tempo / Fast 8–9";
  if (style === "reroll") return locale === "zh" ? "低费追三 / Reroll" : "Low-cost reroll";
  return locale === "zh" ? "灵活运营 / Flex" : "Flexible lines / Flex";
}

function playstyleMatches(comp: UnifiedMetaComp, style: FortuneStyle) {
  const playstyle = comp.playstyle.toLocaleLowerCase("en-US");
  if (style === "tempo") return /(fast\s*[89]|level\s*[89]|tempo)/i.test(playstyle);
  if (style === "reroll") return /(reroll|slow\s*roll)/i.test(playstyle);
  return !/(reroll|slow\s*roll)/i.test(playstyle);
}

function tierWeight(comp: UnifiedMetaComp) {
  if (comp.tier === "S") return 400;
  if (comp.tier === "A") return 300;
  if (comp.tier === "B") return 200;
  return 180;
}

function recommendationScore(comp: UnifiedMetaComp, seed: number, style: FortuneStyle) {
  const styleBonus = playstyleMatches(comp, style) ? 90 : 0;
  const rankingBonus = comp.ranking ? Math.round(comp.ranking.top4Rate * 100) : 0;
  const dailyTieBreak = hashText(seed + ":" + comp.sourceId + ":" + comp.id) % 38;
  return tierWeight(comp) + styleBonus + rankingBonus + dailyTieBreak;
}

function adviceForScore(score: number, locale: "zh" | "en") {
  if (score >= 84) {
    return locale === "zh"
      ? "适合排位。今天更偏向主动定阵容，但仍以开局装备和来牌为准。"
      : "A good ranked day. Commit a little earlier, but still follow your opener, items and shops.";
  }
  if (score >= 70) {
    return locale === "zh"
      ? "可以正常排位，优先玩熟悉阵容；前两阶段不顺就保留转阵余地。"
      : "Queue normally and favor familiar lines. Keep an exit route if Stage 2–3 starts poorly.";
  }
  if (score >= 55) {
    return locale === "zh"
      ? "更适合练阵容或打匹配。排位建议设一个止损线，连续两局不顺就休息。"
      : "Better for practice or normals. If ranked, set a stop rule and take a break after two rough games.";
  }
  return locale === "zh"
    ? "今天建议少打排位，先用开局助手看质量；想玩就以熟悉、低操作负担的阵容为主。"
    : "Keep ranked volume low. Use Opening Assistant first and favor familiar, lower-execution comps.";
}

export default function FortunePage() {
  const { locale, tr } = useLocale();
  const [today, setToday] = useState("");
  const [profileName, setProfileName] = useState("召唤师");
  const [draftName, setDraftName] = useState("召唤师");
  const [copyState, setCopyState] = useState("");

  useEffect(() => {
    setToday(localDateKey(new Date()));
    try {
      const saved = window.localStorage.getItem(PROFILE_KEY)?.trim();
      if (saved) {
        setProfileName(saved);
        setDraftName(saved);
      }
    } catch {}
  }, []);

  const fortune = useMemo(() => {
    const dateKey = today || "loading";
    const identity = profileName.trim() || "召唤师";
    const seed = hashText(dateKey + "|" + identity.toLocaleLowerCase("zh-CN"));
    const score = seededNumber(seed, "overall", 42, 96);
    const style = (["tempo", "reroll", "flex"] as FortuneStyle[])[seed % 3];
    const level = fortuneLevel(score);
    const dimensions = [
      { zh: "来牌运", en: "Shop luck", value: seededNumber(seed, "shops", 44, 97) },
      { zh: "装备运", en: "Item luck", value: seededNumber(seed, "items", 44, 97) },
      { zh: "强化运", en: "Augment luck", value: seededNumber(seed, "augments", 44, 97) },
      { zh: "运营手感", en: "Tempo feel", value: seededNumber(seed, "tempo", 44, 97) },
    ];
    const keywordsZh = ["稳血", "灵活转阵", "少贪", "提前拉人口", "经济优先", "看同行", "装备先合", "站位细节"];
    const keywordsEn = ["preserve HP", "stay flexible", "avoid greed", "level earlier", "economy first", "scout", "slam items", "positioning"];
    const keywordIndex = seed % keywordsZh.length;

    const guides = groupCompGuides(metaComps);
    const recommendations = [...guides]
      .sort((left, right) => recommendationScore(right, seed, style) - recommendationScore(left, seed, style))
      .slice(0, 3);

    return {
      score,
      style,
      level,
      dimensions,
      keyword: locale === "zh" ? keywordsZh[keywordIndex] : keywordsEn[keywordIndex],
      recommendations,
    };
  }, [locale, profileName, today]);

  const dateLabel = useMemo(() => {
    if (!today) return tr("读取本地日期…", "Reading local date…");
    const parts = today.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-CA", {
      year: "numeric",
      month: locale === "zh" ? "long" : "short",
      day: "numeric",
      weekday: "short",
    }).format(date);
  }, [locale, today, tr]);

  function applyProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = draftName.trim() || tr("召唤师", "Summoner");
    setProfileName(next);
    setDraftName(next);
    try { window.localStorage.setItem(PROFILE_KEY, next); } catch {}
  }

  async function copyFortune() {
    const top = fortune.recommendations[0];
    const text = locale === "zh"
      ? profileName + " · " + dateLabel + "\n今日TFT运势 " + fortune.score + "/100 · " + fortune.level.zh + "\n适合：" + styleLabel(fortune.style, locale) + "\n今日关键词：" + fortune.keyword + "\n推荐阵容：" + (top?.nameZh ?? "—") + "\n（娱乐型每日签，不代表真实胜率）"
      : profileName + " · " + dateLabel + "\nToday's TFT fortune: " + fortune.score + "/100 · " + fortune.level.en + "\nStyle: " + styleLabel(fortune.style, locale) + "\nKeyword: " + fortune.keyword + "\nRecommended comp: " + (top?.name ?? "—") + "\n(For fun only; not a prediction of actual win rate.)";
    try {
      await navigator.clipboard.writeText(text);
      setCopyState(tr("已复制", "Copied"));
      window.setTimeout(() => setCopyState(""), 1400);
    } catch {
      setCopyState(tr("复制失败", "Copy failed"));
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>DAILY TFT FORTUNE · {dateLabel}</div>
          <h1>{tr("今日上分运势", "Daily TFT Fortune")}</h1>
          <p>{tr(
            "用“本地日期 + 你的昵称”生成每天固定的一张娱乐签，再从当前阵容资料里挑出更贴合今日风格的阵容。刷新页面不会变。",
            "A deterministic daily card generated from your local date + nickname, then matched to current comp data. Refreshing will not reroll it."
          )}</p>
        </div>
        <form className={styles.profileForm} onSubmit={applyProfile}>
          <label htmlFor="fortune-name">{tr("你的昵称", "Nickname")}</label>
          <div><input id="fortune-name" value={draftName} maxLength={24} onChange={(event) => setDraftName(event.target.value)} /><button type="submit">{tr("重新算", "Calculate")}</button></div>
          <small>{tr("同一个昵称在同一天得到同一结果。", "Same nickname + same day = same result.")}</small>
        </form>
      </header>

      <section className={styles.fortuneCard + " " + styles[fortune.level.tone]}>
        <div className={styles.scoreBlock}>
          <span>{tr("今日TFT适配度", "TFT suitability")}</span>
          <strong>{fortune.score}<em>/100</em></strong>
          <b>{locale === "zh" ? fortune.level.zh : fortune.level.en}</b>
        </div>
        <div className={styles.verdict}>
          <div className={styles.keywordRow}><span>{tr("今日关键词", "Keyword")}</span><strong>{fortune.keyword}</strong></div>
          <h2>{styleLabel(fortune.style, locale)}</h2>
          <p>{adviceForScore(fortune.score, locale)}</p>
          <div className={styles.actions}><Link href="/opening">{tr("先看开局质量", "Check opener")}</Link><button type="button" onClick={copyFortune}>{copyState || tr("复制今日签", "Copy card")}</button></div>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><h2>{tr("今日四项运势", "Today's four signals")}</h2><p>{tr("只是娱乐化指标，不是对 RNG 的真实预测。", "Entertainment signals only; they do not predict RNG.")}</p></div></div>
          <div className={styles.meters}>
            {fortune.dimensions.map((item) => (
              <div className={styles.meter} key={item.en}>
                <div><span>{locale === "zh" ? item.zh : item.en}</span><strong>{item.value}</strong></div>
                <div className={styles.track}><i style={{ width: item.value + "%" }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}><div><h2>{tr("今天适合怎么玩", "How to play today")}</h2><p>{tr("把“运势”翻译成可执行的游戏节奏。", "Turn the playful fortune into a practical game plan.")}</p></div></div>
          <div className={styles.plan}>
            <div><span>01</span><p>{fortune.style === "reroll" ? tr("前期保经济，确认低费核心数量和同行后再决定追三。", "Preserve economy early; confirm copies and contest before committing to reroll.") : tr("前期能合就合，优先保血，不为完美装备空等。", "Slam playable items and preserve HP instead of waiting for perfect components.")}</p></div>
            <div><span>02</span><p>{fortune.style === "tempo" ? tr("中期主动拉人口，用质量换连胜与容错。", "Level proactively in mid game and trade economy for board strength when it protects streaks.") : tr("中期保持可转阵，先看牌和装备再锁最终阵容。", "Stay flexible mid game; let shops and items decide the final line.")}</p></div>
            <div><span>03</span><p>{tr("连续两局明显不顺就休息一下，再回来会比硬打更稳。", "If two games go badly in a row, take a short break instead of forcing more queues.")}</p></div>
          </div>
        </section>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div><h2>{tr("今日推荐阵容", "Today's recommended comps")}</h2><p>{tr("优先从当前版本资料中选高评级、且符合今日节奏的阵容；具体仍要服从开局来牌与装备。", "Prioritizes higher-rated current comps that fit today's style; your actual opener and items still come first.")}</p></div>
          <Link href="/comps">{tr("查看全部阵容", "All comps")} ↗</Link>
        </div>
        <div className={styles.recommendations}>
          {fortune.recommendations.map((comp, index) => (
            <article className={styles.compCard} key={comp.sourceId + ":" + comp.id}>
              <div className={styles.compTop}><span className={styles.rank}>{index === 0 ? tr("本命", "TOP") : "0" + (index + 1)}</span><span className={styles.tier}>{comp.tier === "ACTIVE" ? "·" : comp.tier}</span></div>
              <h3>{locale === "zh" ? comp.nameZh : comp.name}</h3>
              <p className={styles.source}>{comp.source} · {comp.playstyle}</p>
              <p className={styles.when}>{comp.whenToPlay || tr("按当前来牌、装备与经济决定是否进入。", "Enter when shops, items and economy support it.")}</p>
              <div className={styles.traits}>{comp.traits.slice(0, 4).map((trait) => <span key={trait}>{trait}</span>)}</div>
              <div className={styles.compActions}>
                <Link href={"/comps?source=" + encodeURIComponent(comp.sourceId) + "&comp=" + encodeURIComponent(comp.id)}>{tr("看完整攻略", "Guide")}</Link>
                <Link href={"/focus?source=" + encodeURIComponent(comp.sourceId) + "&id=" + encodeURIComponent(comp.id)}>{tr("进入对局", "Focus")}</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className={styles.disclaimer}>
        <strong>{tr("说明", "Note")}</strong>
        <span>{tr("“运势”部分是娱乐玩法，不基于占星或真实概率模型；阵容名称、评级和攻略来自项目当前数据。", "The fortune layer is for fun and is not astrology or a probability model. Comp names, ratings and guides come from the project's current data.")}</span>
      </footer>
    </div>
  );
}
