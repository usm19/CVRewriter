import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, EASE, Stage, fadeUp, grad } from "../theme";
import { usePortrait } from "../ui";

export const Private: React.FC = () => {
  const frame = useCurrentFrame();
  const portrait = usePortrait();
  const draw = interpolate(frame, [16, 60], [120, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const Space: React.FC<{ name: string; from: number }> = ({ name, from }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 20, background: C.surface, borderRadius: 22, padding: "30px 44px", ...fadeUp(frame, from) }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(70,200,207,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
      </div>
      <div style={{ fontSize: 44, fontWeight: 650, color: C.text }}>{name}</div>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.text2} strokeWidth="2" strokeLinecap="round" style={{ marginLeft: 10 }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    </div>
  );
  return (
    <Stage>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: portrait ? 46 : 40 }}>
        <div style={{ width: 150, height: 150, borderRadius: 40, background: grad, display: "flex", justifyContent: "center", alignItems: "center", boxShadow: "0 22px 70px rgba(59,208,160,0.35)", ...fadeUp(frame, 6) }}>
          <svg width="76" height="76" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" strokeDasharray="60" strokeDashoffset={draw / 2} />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeDasharray="60" strokeDashoffset={draw} />
          </svg>
        </div>
        <div style={{ fontSize: portrait ? 80 : 100, fontWeight: 750, letterSpacing: "-0.03em", color: C.text, ...fadeUp(frame, 26) }}>
          Private by architecture.
        </div>
        <div style={{ fontSize: portrait ? 42 : 48, color: C.text2, maxWidth: 1250, textAlign: "center", lineHeight: 1.4, ...fadeUp(frame, 52) }}>
          No accounts. No servers. Your CV never leaves your phone.
        </div>
        <div style={{ display: "flex", gap: 34, flexDirection: portrait ? "column" : "row", ...fadeUp(frame, 84) }}>
          <Space name="John" from={84} />
          <Space name="David" from={100} />
        </div>
        <div style={{ fontSize: portrait ? 38 : 42, color: C.text2, ...fadeUp(frame, 122) }}>
          Sharing a device? Everyone gets their own encrypted space.
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
