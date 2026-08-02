import React from "react";
import { Interactive, interpolate, useCurrentFrame, Easing } from "remotion";
import { C, Stage, fadeUp, grad } from "../theme";

/* Colour arrives with the brand. */
export const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage lit={interpolate(frame, [0, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <Interactive.Div name="Wordmark" style={{ fontSize: 168, fontWeight: 750, letterSpacing: "-0.035em", display: "flex", alignItems: "baseline", ...fadeUp(frame, 6, 26) }}>
          CVRewriter
          <Interactive.Div
            name="Dot"
            style={{
              width: 40,
              height: 40,
              marginLeft: 14,
              borderRadius: 20,
              background: grad,
              scale: String(interpolate(frame, [22, 52], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({ damping: 13 }) })),
            }}
          />
        </Interactive.Div>
        <Interactive.Div name="Tagline" style={{ fontSize: 56, color: C.text2, marginTop: 30, ...fadeUp(frame, 48) }}>
          Your CV, reworded for the job in front of you.
        </Interactive.Div>
      </div>
    </Stage>
  );
};
