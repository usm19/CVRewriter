import React from "react";
import { Interactive, interpolate, useCurrentFrame } from "remotion";
import { C, EASE, Stage, fadeUp, grad } from "../theme";

const URL = "greatjobs.co.uk/team-leader-4821";

export const Paste: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = Math.round(interpolate(frame, [30, 92], [0, URL.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const press = interpolate(frame, [108, 116, 126], [1, 0.94, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 66 }}>
        <Interactive.Div name="Headline" style={{ fontSize: 100, fontWeight: 700, letterSpacing: "-0.03em", ...fadeUp(frame, 4) }}>
          Paste the listing. That is the whole job.
        </Interactive.Div>
        <Interactive.Div name="InputRow" style={{ display: "flex", gap: 20, alignItems: "center", ...fadeUp(frame, 20) }}>
          <div style={{ width: 880, background: C.surface2, borderRadius: 22, padding: "30px 38px", fontSize: 44, color: C.text, border: `2px solid ${C.surface2}`, textAlign: "left" }}>
            {URL.slice(0, typed)}
            <span style={{ opacity: frame % 20 < 10 && typed < URL.length ? 1 : 0 }}>|</span>
          </div>
          <Interactive.Div name="TailorBtn" style={{ background: grad, color: C.ink, borderRadius: 22, padding: "30px 44px", fontSize: 44, fontWeight: 650, scale: String(press), boxShadow: "0 12px 40px rgba(59,208,160,0.35)" }}>
            Tailor my CV
          </Interactive.Div>
        </Interactive.Div>
        <Interactive.Div name="Sub" style={{ fontSize: 46, color: C.text2, ...fadeUp(frame, 120) }}>
          A real engine reads it on your phone. Nothing is uploaded.
        </Interactive.Div>
      </div>
    </Stage>
  );
};
