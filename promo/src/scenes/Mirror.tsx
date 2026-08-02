import React from "react";
import { Interactive, interpolate, useCurrentFrame, Easing } from "remotion";
import { C, EASE, Stage, fadeUp, grad } from "../theme";

const Swap: React.FC<{ from: number; old: string; neu: string; chip: string; pre: string; post: string }> = ({ from, old, neu, chip, pre, post }) => {
  const frame = useCurrentFrame();
  const strike = interpolate(frame, [from, from + 16], [0, 104], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const inNew = interpolate(frame, [from + 12, from + 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({ damping: 15 }) });
  return (
    <Interactive.Div name={`Swap-${neu}`} style={{ background: C.surface, borderRadius: 24, padding: "44px 54px", fontSize: 54, textAlign: "left", boxShadow: "0 24px 70px rgba(0,0,0,0.45)", ...fadeUp(frame, from - 14) }}>
      <span style={{ color: C.text2 }}>{pre}</span>
      <span style={{ position: "relative", margin: "0 6px" }}>
        <span style={{ color: C.text2 }}>{old}</span>
        <span style={{ position: "absolute", left: 0, top: "52%", height: 5, borderRadius: 3, background: C.danger, width: `${strike}%` }} />
      </span>
      <span style={{ display: "inline-block", color: C.accent, fontWeight: 750, marginLeft: 14, scale: String(inNew), opacity: inNew }}>{neu}</span>
      <span style={{ color: C.text2 }}>{post}</span>
      <span style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 26, fontSize: 30, fontWeight: 600, color: C.ink, background: grad, borderRadius: 999, padding: "10px 24px", opacity: interpolate(frame, [from + 26, from + 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }) }}>
        the listing says "{neu}"
      </span>
    </Interactive.Div>
  );
};

export const Mirror: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 54, padding: "0 120px" }}>
        <Interactive.Div name="Headline" style={{ fontSize: 96, fontWeight: 700, letterSpacing: "-0.03em", ...fadeUp(frame, 4) }}>
          It mirrors the job's language. In your voice.
        </Interactive.Div>
        <Swap from={44} pre="I organised " old="shift planning" neu="rotas" chip="rotas" post=" for a team of eight" />
        <Swap from={110} pre="Trained new starters in " old="customer care" neu="customer service" chip="customer service" post="" />
        <Interactive.Div name="Sub" style={{ fontSize: 46, color: C.text2, ...fadeUp(frame, 178) }}>
          Word by word, with your say-so. It never invents a thing.
        </Interactive.Div>
      </div>
    </Stage>
  );
};
