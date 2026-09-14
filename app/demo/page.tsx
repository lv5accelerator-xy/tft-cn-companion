"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { metaComps } from "@/data/meta";
import styles from "./demo.module.css";

const steps = [
  { key: "opening", label: "1 · OPENING", title: "开局：把你拿到的牌和散件放进来", body: "助手先看你已经拥有的英雄、对子和可合成装备，再把候选阵容按契合度排序。它不是单纯把版本第一名塞给你。" },
  { key: "compare", label: "2 · COMPARE", title: "中期：把 Plan A / B / C 放在一屏比较", body: "比较共同英雄、共同装备、独有核心和静态换阵成本，帮助你理解保留了多少已有资产。" },
  { key: "focus", label: "3 · FOCUS", title: "对局：按阶段看棋盘、搜牌节点和装备重点", body: "Stage 2 / 3 / 4 对应不同棋盘与节奏，适合作为第二屏。所有快捷键和状态都保留在本机。" },
  { key: "review", label: "4 · REVIEW", title: "赛后：把这一局变成你的长期数据", body: "保存名次、最终棋盘、问题标签和一句复盘。局数积累后，可以看到个人趋势、常见问题和不同阵容的个人表现。" },
] as const;

export default function DemoPage() {
  const [index, setIndex] = useState(0);
  const comp = metaComps[0];
  const step = steps[index];
  const board = useMemo(() => comp?.board ?? [], [comp]);

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><span>V1.4.3 · 3-MINUTE GUIDED DEMO</span><h1>不改你的数据，先体验完整一局</h1><p>这个 Demo 不写入 localStorage，也不会覆盖收藏、候选、Focus 或复盘历史。看完以后再决定是否开始自己的对局。</p></div>
        <Link href="/opening">开始真实使用</Link>
      </header>

      <div className={styles.stepper}>{steps.map((item, itemIndex) => <button key={item.key} className={itemIndex === index ? styles.active : ""} onClick={() => setIndex(itemIndex)}><b>{itemIndex + 1}</b><span>{item.key.toUpperCase()}</span></button>)}</div>

      <section className={styles.stage}>
        <div className={styles.copy}>
          <span>{step.label}</span>
          <h2>{step.title}</h2>
          <p>{step.body}</p>
          <div className={styles.sample}><strong>示例阵容</strong><b>{comp?.nameZh ?? "Set 18 示例阵容"}</b><small>{comp?.name ?? "TFT Companion"} · {comp?.playstyle ?? "NA"}</small></div>
          <div className={styles.controls}><button disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>上一步</button>{index < steps.length - 1 ? <button className={styles.primary} onClick={() => setIndex((value) => Math.min(steps.length - 1, value + 1))}>下一步</button> : <Link className={styles.primary} href="/opening">开始我的第一局</Link>}</div>
        </div>

        <div className={styles.visual}>
          {step.key === "opening" ? <div className={styles.openingMock}><div><b>开局英雄</b><span>Kayle ×2</span><span>Frontline ×2</span><span>Flex unit ×1</span></div><div><b>散件</b><span>B.F. Sword</span><span>Recurve Bow</span><span>Sparring Gloves</span></div><aside><strong>86</strong><span>OPENING FIT</span><small>核心对子 + 可合成装备 + 阵容强度</small></aside></div> : null}
          {step.key === "compare" ? <div className={styles.compareMock}>{["A", "B", "C"].map((plan, planIndex) => <article key={plan} className={planIndex === 0 ? styles.planA : ""}><span>PLAN {plan}</span><strong>{[86, 78, 71][planIndex]}</strong><b>{["最匹配当前资源", "换阵成本较低", "上限更高但更难"][planIndex]}</b><small>{planIndex === 0 ? "共享 5 英雄 · 2 件通用装" : "保留已有资产并展示差异"}</small></article>)}</div> : null}
          {step.key === "focus" ? <div className={styles.focusMock}><div className={styles.board}>{[0,1,2,3].flatMap((row) => [0,1,2,3,4,5,6].map((col) => { const unit = board.find((entry) => entry.row === row && entry.col === col); return <span key={`${row}-${col}`}>{unit ? unit.unit.slice(0, 5) : ""}</span>; }))}</div><aside><b>NOW</b><strong>Stage 3</strong><b>ROLL</b><span>稳住质量 / 保经济</span><b>ITEM</b><span>主 C → 主坦</span><b>NEXT</b><span>准备进入 Stage 4</span></aside></div> : null}
          {step.key === "review" ? <div className={styles.reviewMock}><article><span>最终名次</span><strong>#2</strong></article><article><span>近 5 局平均</span><strong>3.40</strong></article><article><span>Top 4</span><strong>70%</strong></article><article><span>常见问题</span><strong>搜牌太晚</strong></article><div><b>一句复盘</b><p>4-2 启动偏晚；下次在相同资源条件下更早完成主坦二星。</p></div></div> : null}
        </div>
      </section>

      <footer><span>Demo 只展示产品工作流，不代表实时对局指令，也不会读取对手或隐藏信息。</span><Link href="/share">看看分享卡</Link></footer>
    </div>
  );
}
