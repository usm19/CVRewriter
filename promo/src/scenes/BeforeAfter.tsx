import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, EASE, Stage, fadeUp, grad } from "../theme";
import { usePortrait } from "../ui";

const LINES: Array<[string, string, string, string]> = [
  ["I organised ", "shift planning", "rotas", " for a team of eight."],
  ["Trained new starters in ", "customer care", "customer service", "."],
  ["Weekly ", "stock counts", "stocktakes", ", shrinkage kept low."],
];

/* One big page, one wipe: the same CV crossing into the job's language. */
export const BeforeAfter: React.FC = () => {
  const frame = useCurrentFrame();
  const portrait = usePortrait();
  const wipe = interpolate(frame, [70, 150], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const pageW = portrait ? 880 : 1150;
  const fs = portrait ? 40 : 44;
  const Page: React.FC<{ after?: boolean }> = ({ after }) => (
    <div style={{ width: pageW, background: "#ffffff", borderRadius: 22, padding: portrait ? "54px 60px" : "58px 72px", boxShadow: "0 36px 110px rgba(0,0,0,0.55)" }}>
      <div style={{ fontSize: fs * 1.25, fontWeight: 750, color: "#24272b", marginBottom: 8 }}>Priya Shah</div>
      <div style={{ fontSize: fs * 0.62, color: "#5a6570", marginBottom: 26 }}>Retail supervisor, Manchester</div>
      {LINES.map(([pre, old, neu, post], i) => (
        <div key={i} style={{ fontSize: fs, color: "#3a3f44", lineHeight: 1.5, marginBottom: 14 }}>
          {pre}
          {after ? <b style={{ color: "#0d7e86" }}>{neu}</b> : <span>{old}</span>}
          {post}
        </div>
      ))}
    </div>
  );
  return (
    <Stage>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: portrait ? 54 : 44, flexDirection: "column", padding: portrait ? "110px 0" : "70px 0" }}>
        <div style={{ fontSize: portrait ? 78 : 92, fontWeight: 750, letterSpacing: "-0.03em", color: C.text, ...fadeUp(frame, 4) }}>
          Same CV. Their language.
        </div>
        <div style={{ position: "relative", ...fadeUp(frame, 22) }}>
          <Page />
          <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - wipe}% 0 0)` }}>
            <Page after />
          </div>
          <div style={{ position: "absolute", top: -18, bottom: -18, left: `${wipe}%`, width: 7, borderRadius: 4, background: grad, opacity: wipe > 0 && wipe < 100 ? 1 : 0, boxShadow: "0 0 34px rgba(59,208,160,0.8)" }} />
        </div>
        <div style={{ fontSize: portrait ? 42 : 46, color: C.text2, ...fadeUp(frame, 168) }}>
          Three words changed. Nothing invented.
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
