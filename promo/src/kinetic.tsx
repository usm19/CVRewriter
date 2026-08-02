import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE } from "./theme";

/*
 * Screen-space type. Words arrive one by one - lifted, unblurred, unmasked -
 * and the whole block drifts off before the next beat lands, so language
 * flows with the camera instead of sitting on slides.
 */
export const Headline: React.FC<{
  from: number;
  out: number;
  title: string;
  sub?: string;
  portrait: boolean;
  align?: "left" | "center";
  width?: number;
  small?: boolean;
}> = ({ from, out, title, sub, portrait, align = "left", width, small }) => {
  const frame = useCurrentFrame();
  if (frame < from - 10 || frame > out + 30) return null;
  const leave = interpolate(frame, [out, out + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const words = title.split(" ");
  const titleSize = small ? (portrait ? 58 : 64) : portrait ? 84 : 96;
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", gap: portrait ? 20 : 26,
        alignItems: align === "center" ? "center" : "flex-start",
        textAlign: align === "center" ? "center" : "left",
        maxWidth: width,
        opacity: 1 - leave,
        translate: `0px ${-46 * leave}px`,
        filter: `blur(${3 * leave}px)`,
      }}
    >
      <div style={{ fontSize: titleSize, fontWeight: 750, letterSpacing: "-0.03em", lineHeight: 1.06, color: C.text }}>
        {words.map((w, i) => {
          const at = from + i * 5;
          const p = interpolate(frame, [at, at + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
          return (
            <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: p, translate: `0px ${34 * (1 - p)}px`, filter: `blur(${4 * (1 - p)}px)` }}>
              {w + (i < words.length - 1 ? " " : "")}
            </span>
          );
        })}
      </div>
      {sub ? (
        <div
          style={{
            fontSize: small ? (portrait ? 34 : 34) : portrait ? 42 : 44, color: C.text2, lineHeight: 1.35, fontWeight: 450,
            opacity: interpolate(frame, [from + 14, from + 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }),
            translate: `0px ${interpolate(frame, [from + 14, from + 36], [26, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE })}px`,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
};

/* Slow airborne dust: keeps the frame alive between beats. Deterministic. */
export const Particles: React.FC<{ camX: number }> = ({ camX }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const dots = Array.from({ length: 26 }, (_, i) => {
    const seed = (i * 733) % 997;
    const x = ((seed * 1.7 + i * 149) % (width + 200)) - 100 - camX * (0.03 + (i % 5) * 0.012);
    const speed = 0.16 + (i % 7) * 0.05;
    const y = ((seed * 2.3 + height - frame * speed * 2) % (height + 160)) - 80;
    const r = 2 + (i % 4) * 1.6;
    return { x: ((x % (width + 200)) + width + 200) % (width + 200) - 100, y, r, o: 0.05 + (i % 3) * 0.03 };
  });
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {dots.map((d, i) => (
        <div key={i} style={{ position: "absolute", left: d.x, top: d.y, width: d.r, height: d.r, borderRadius: "50%", background: i % 3 ? C.gradA : C.gradB, opacity: d.o }} />
      ))}
    </div>
  );
};
