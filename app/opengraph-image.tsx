import { ImageResponse } from "next/og";

export const alt = "TFT CN Companion — NA TFT 中文副屏助手";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", flexDirection: "column", justifyContent: "space-between", overflow: "hidden", padding: 58, background: "linear-gradient(135deg, #0a0e16 0%, #111827 46%, #070a10 100%)", color: "#f4f7fb", fontFamily: "Arial, sans-serif" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", opacity: .34, backgroundImage: "linear-gradient(rgba(85,230,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(85,230,255,.08) 1px, transparent 1px)", backgroundSize: "42px 42px" }} />
      <div style={{ position: "absolute", width: 520, height: 520, right: -120, top: -210, borderRadius: 520, background: "radial-gradient(circle, rgba(85,230,255,.18), rgba(155,140,255,.07) 42%, transparent 70%)" }} />
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}><div style={{ width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(145deg,#172238,#0d1320)", border: "1px solid rgba(85,230,255,.45)", fontSize: 22, fontWeight: 900 }}>TFT</div><div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 30, fontWeight: 900 }}>TFT CN Companion</span><span style={{ marginTop: 6, fontSize: 18, color: "#7f91aa", letterSpacing: 1.4 }}>SET 18 · NA · V1.6.8 DATA FIDELITY</span></div></div>
        <div style={{ padding: "10px 16px", borderRadius: 12, background: "rgba(155,140,255,.12)", border: "1px solid rgba(155,140,255,.34)", color: "#ddd7ff", fontSize: 18, fontWeight: 800 }}>中文玩家 × 英文客户端</div>
      </div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", maxWidth: 1040 }}><span style={{ color: "#55e6ff", fontSize: 21, fontWeight: 900, letterSpacing: 3 }}>TACTICAL COMMAND // OPENING → COACH → FOCUS → REVIEW</span><div style={{ marginTop: 18, fontSize: 60, lineHeight: 1.06, fontWeight: 900 }}>你的 TFT 战术终端</div><div style={{ marginTop: 20, fontSize: 25, lineHeight: 1.45, color: "#cbd5e2" }}>18.2 一图流条件匹配 · Stage 战术棋盘 · 一键结束对局复盘 · 个人趋势</div></div>
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#7f91aa", fontSize: 18 }}><span>tft-cn-companion-web.vercel.app</span><span>NA Teamfight Tactics companion for Chinese players</span></div>
    </div>,
    size,
  );
}
