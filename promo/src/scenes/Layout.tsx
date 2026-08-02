import React from "react";
import { Interactive, interpolate, useCurrentFrame } from "remotion";
import { C, EASE, Stage, fadeUp } from "../theme";

const Page: React.FC<{ swapped?: boolean }> = ({ swapped }) => (
  <div style={{ width: 340, height: 480, background: "#ffffff", borderRadius: 14, display: "flex", overflow: "hidden", boxShadow: "0 30px 90px rgba(0,0,0,0.5)" }}>
    <div style={{ width: 108, background: "#1e3a4c", padding: "26px 14px" }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{ height: 7, borderRadius: 4, marginBottom: 12, width: 66 + ((i * 23) % 22), background: i === 4 && swapped ? C.gradA : "rgba(232,238,242,0.7)" }} />
      ))}
    </div>
    <div style={{ flex: 1, padding: "26px 20px" }}>
      <div style={{ height: 16, width: 120, background: "#24272b", borderRadius: 8 }} />
      {[...Array(11)].map((_, i) => (
        <div key={i} style={{ height: 7, borderRadius: 4, marginTop: 13, width: 130 + ((i * 31) % 60), background: [2, 6].includes(i) && swapped ? C.gradA : "#c9ced4" }} />
      ))}
    </div>
  </div>
);

export const Layout: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 60 }}>
        <Interactive.Div name="Headline" style={{ fontSize: 100, fontWeight: 700, letterSpacing: "-0.03em", ...fadeUp(frame, 4) }}>
          Your layout. Your fonts. Untouched.
        </Interactive.Div>
        <Interactive.Div name="Pages" style={{ display: "flex", gap: 70, alignItems: "center", ...fadeUp(frame, 22) }}>
          <Page />
          <div style={{ fontSize: 70, color: C.text2, opacity: interpolate(frame, [50, 66], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }) }}>→</div>
          <Interactive.Div name="TailoredPage" style={{ opacity: interpolate(frame, [56, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }), translate: `0px ${interpolate(frame, [56, 80], [26, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE })}px` }}>
            <Page swapped />
          </Interactive.Div>
        </Interactive.Div>
        <Interactive.Div name="Sub" style={{ fontSize: 46, color: C.text2, ...fadeUp(frame, 96) }}>
          Rebuilt from your own PDF, line by line, as a one-page PDF recruiters' software can read.
        </Interactive.Div>
      </div>
    </Stage>
  );
};
