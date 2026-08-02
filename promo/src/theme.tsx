import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";

export const C = {
  bg: "#0d1414",
  surface: "#152020",
  surface2: "#1c2928",
  text: "#e7edec",
  text2: "#93a2a0",
  accent: "#46c8cf",
  gradA: "#3bd0a0",
  gradB: "#54aaf2",
  danger: "#e28a7b",
  ink: "#05222a",
};
export const FONT = "Outfit, sans-serif";
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const grad = `linear-gradient(135deg, ${C.gradA}, ${C.gradB})`;

/* Ambient stage: the app's fixed green/blue glow world. */
export const Stage: React.FC<{ children: React.ReactNode; lit?: number }> = ({ children, lit = 1 }) => (
  <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: FONT, color: C.text }}>
    <AbsoluteFill
      style={{
        opacity: lit,
        background: `radial-gradient(900px 620px at 12% -6%, rgba(59,208,160,0.13), transparent 60%),
                     radial-gradient(800px 560px at 108% 38%, rgba(84,170,242,0.10), transparent 65%)`,
      }}
    />
    {children}
  </AbsoluteFill>
);

export const fadeUp = (frame: number, from: number, dur = 22, dist = 34) => ({
  opacity: interpolate(frame, [from, from + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }),
  translate: `0px ${interpolate(frame, [from, from + dur], [dist, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE })}px`,
});
