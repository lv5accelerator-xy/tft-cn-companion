import { ImageResponse } from "next/og";

export const alt = "TFT CN Companion — NA TFT 中文副屏助手";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 58, background: "linear-gradient(135deg, #24203f 0%, #11141b 42%, #0d0f14 100%)", color: "#f1f3f8", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}><div style={{ width: 72, height: 72, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1e28", border: "1px solid #3a4050", fontSize: 22, fontWeight: 900 }}>TFT</div><div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 30, fontWeight: 900 }}>TFT CN Companion</span><span style={{ marginTop: 6, fontSize: 18, color: "#8d94a4" }}>SET 18 · NA · V1.6.5</span></div></div>
        <div style={{ padding: "10px 16px", borderRadius: 12, background: "#2a2447", border: "1px solid #574d8b", color: "#ddd7ff", fontSize: 18, fontWeight: 800 }}>中文玩家 × 英文客户端</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 1030 }}><span style={{ color: "#d7b566", fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>OPENING → FOCUS → REVIEW → INSIGHTS</span><div style={{ marginTop: 18, fontSize: 58, lineHeight: 1.08, fontWeight: 900 }}>陪你打一整局的 TFT 副屏助手</div><div style={{ marginTop: 20, fontSize: 25, lineHeight: 1.45, color: "#c7cbd5" }}>开局资源匹配 · Plan A/B/C 对比 · Stage 战术棋盘 · 赛后复盘 · 个人趋势</div></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#8d94a4", fontSize: 18 }}><span>tft-cn-companion-web.vercel.app</span><span>NA Teamfight Tactics companion for Chinese players</span></div>
    </div>,
    size,
  );
}
