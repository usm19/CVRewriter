import React from "react";
import { Interactive, interpolate, useCurrentFrame, Easing } from "remotion";
import { C, Stage, fadeUp, grad } from "../theme";

export const NewEra: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 54 }}>
        <Interactive.Div name="Headline" style={{ fontSize: 148, fontWeight: 750, letterSpacing: "-0.035em", ...fadeUp(frame, 8, 26) }}>
          A new era of applying.
        </Interactive.Div>
        <Interactive.Div
          name="UrlPill"
          style={{
            fontSize: 54, fontWeight: 650, color: C.text, background: C.surface, borderRadius: 999, padding: "30px 58px",
            border: "2.5px solid transparent",
            backgroundImage: `linear-gradient(${C.surface}, ${C.surface}), ${grad}`,
            backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box",
            scale: String(interpolate(frame, [40, 66], [0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({ damping: 14 }) })),
            opacity: interpolate(frame, [40, 58], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          usm19.github.io/CVRewriter
        </Interactive.Div>
        <Interactive.Div name="Sub" style={{ fontSize: 48, color: C.text2, ...fadeUp(frame, 78) }}>
          Free. On your phone. Add it to your Home Screen.
        </Interactive.Div>
        <Interactive.Div name="Mark" style={{ fontSize: 44, fontWeight: 750, marginTop: 26, ...fadeUp(frame, 104) }}>
          CVRewriter<span style={{ color: C.accent }}>.</span>
        </Interactive.Div>
      </div>
    </Stage>
  );
};
