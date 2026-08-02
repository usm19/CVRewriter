import React from "react";
import { Interactive, interpolate, useCurrentFrame, Easing } from "remotion";
import { C, Stage, fadeUp } from "../theme";
import { usePortrait } from "../ui";

const Chip: React.FC<{ from: number; n: string; label: string; warn?: boolean }> = ({ from, n, label, warn }) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name={`Chip-${label}`}
      style={{
        display: "flex", alignItems: "baseline", gap: 16, background: C.surface2, borderRadius: 999, padding: "26px 44px",
        scale: String(interpolate(frame, [from, from + 24], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({ damping: 14 }) })),
        opacity: interpolate(frame, [from, from + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}
    >
      <span style={{ fontSize: 64, fontWeight: 750, color: warn ? C.danger : C.accent }}>{n}</span>
      <span style={{ fontSize: 38, color: C.text2, fontWeight: 550 }}>{label}</span>
    </Interactive.Div>
  );
};

export const Honesty: React.FC = () => {
  const frame = useCurrentFrame();
  const portrait = usePortrait();
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 62, padding: "0 120px" }}>
        <Interactive.Div name="Headline" style={{ fontSize: portrait ? 80 : 100, fontWeight: 700, letterSpacing: "-0.03em", ...fadeUp(frame, 4) }}>
          Honest about the gaps.
        </Interactive.Div>
        <div style={{ display: "flex", gap: 30, flexDirection: portrait ? "column" : "row" }}>
          <Chip from={30} n="12" label="asks your CV covers" />
          <Chip from={46} n="6" label="said in your words, aligned" />
          <Chip from={62} n="2" label="for you to weigh up" warn />
        </div>
        <Interactive.Div name="Sub" style={{ fontSize: portrait ? 40 : 46, color: C.text2, maxWidth: 1350, ...fadeUp(frame, 96) }}>
          Asks for a first aid certificate you do not have? It tells you, and you decide.
        </Interactive.Div>
      </div>
    </Stage>
  );
};
