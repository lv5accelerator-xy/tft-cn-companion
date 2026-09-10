"use client";

import { useEffect, useState } from "react";
import { useLocale } from "./LocaleProvider";
import styles from "./shortcut-help.module.css";

export default function ShortcutHelp({ pathname }: { pathname: string }) {
  const { tr } = useLocale();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (typing) return;
      if (event.key === "?") {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const focus = pathname.startsWith("/focus");

  return (
    <>
      <button className={styles.helpButton} onClick={() => setOpen(true)} title={tr("快捷键帮助 (?)", "Shortcut help (?)")}>?</button>
      {open ? (
        <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
          <section className={styles.dialog} role="dialog" aria-modal="true" aria-label={tr("快捷键帮助", "Keyboard shortcuts")}>
            <header><div><span>KEYBOARD</span><h2>{tr("快捷键帮助", "Keyboard shortcuts")}</h2></div><button onClick={() => setOpen(false)} aria-label={tr("关闭", "Close")}>×</button></header>
            <div className={styles.flow}><b>{tr("推荐流程", "Recommended flow")}</b><span>{tr("选择阵容 → 候选 1/2/3 → Q/W/E 阶段 → 赛后复盘", "Choose comp → candidates 1/2/3 → Q/W/E stages → post-game review")}</span></div>
            <div className={styles.grid}>
              <div><kbd>Ctrl / ⌘ + K</kbd><span>{tr("全局快速搜索", "Global quick search")}</span></div>
              <div><kbd>?</kbd><span>{tr("打开 / 关闭本帮助", "Open / close this help")}</span></div>
              {focus ? <>
                <div><kbd>1 · 2 · 3</kbd><span>{tr("切换候选阵容", "Switch candidates")}</span></div>
                <div><kbd>Q · W · E</kbd><span>{tr("切 Stage 2 / 3 / 4", "Stage 2 / 3 / 4")}</span></div>
                <div><kbd>M</kbd><span>{tr("左右镜像棋盘", "Mirror board")}</span></div>
                <div><kbd>B</kbd><span>{tr("当前阶段载入 Builder", "Load stage into Builder")}</span></div>
                <div><kbd>C</kbd><span>{tr("紧凑 HUD", "Compact HUD")}</span></div>
                <div><kbd>Esc</kbd><span>{tr("关闭弹窗", "Close overlays")}</span></div>
              </> : <div className={styles.wide}><kbd>◉</kbd><span>{tr("对局模式里还有 1/2/3、Q/W/E、M、B、C 快捷键。", "Game Focus also supports 1/2/3, Q/W/E, M, B and C.")}</span></div>}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
