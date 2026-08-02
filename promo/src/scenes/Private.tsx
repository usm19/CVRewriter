import React from "react";
import { Interactive, interpolate, useCurrentFrame } from "remotion";
import { C, EASE, Stage, fadeUp, grad } from "../theme";

export const Private: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [16, 60], [120, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 52 }}>
        <Interactive.Div name="Lock" style={{ width: 150, height: 150, borderRadius: 40, background: grad, display: "flex", justifyContent: "center", alignItems: "center", boxShadow: "0 22px 70px rgba(59,208,160,0.35)", ...fadeUp(frame, 6) }}>
          <svg width="76" height="76" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" strokeDasharray="60" strokeDashoffset={draw / 2} />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeDasharray="60" strokeDashoffset={draw} />
          </svg>
        </Interactive.Div>
        <Interactive.Div name="Headline" style={{ fontSize: 100, fontWeight: 700, letterSpacing: "-0.03em", ...fadeUp(frame, 30) }}>
          Private by architecture.
        </Interactive.Div>
        <Interactive.Div name="Line1" style={{ fontSize: 50, color: C.text2, ...fadeUp(frame, 58) }}>
          No accounts. No servers. Your CV never leaves your phone.
        </Interactive.Div>
        <Interactive.Div name="Line2" style={{ fontSize: 50, color: C.text2, ...fadeUp(frame, 86) }}>
          Sharing a device? Everyone gets their own encrypted space, locked by passphrase.
        </Interactive.Div>
      </div>
    </Stage>
  );
};
