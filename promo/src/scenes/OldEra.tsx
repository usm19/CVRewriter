import React from "react";
import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { C, EASE, FONT, fadeUp } from "../theme";
import { usePortrait } from "../ui";

/* The one CV, photocopied into the void. Monochrome: colour has not arrived yet. */
export const OldEra: React.FC = () => {
  const frame = useCurrentFrame();
  const portrait = usePortrait();
  return (
    <AbsoluteFill style={{ backgroundColor: "#101312", fontFamily: FONT, color: C.text, justifyContent: "center", alignItems: "center" }}>
      {[...Array(6)].map((_, i) => (
        <Interactive.Div
          key={i}
          name={`GhostCV${i}`}
          style={{
            position: "absolute",
            width: 230,
            height: 320,
            borderRadius: 10,
            border: "1.5px solid rgba(231,237,236,0.13)",
            background: "rgba(231,237,236,0.03)",
            translate: `${(portrait ? -400 + i * 160 : -560 + i * 224)}px ${interpolate(frame, [0, 170], [90 + (i % 3) * 26, 40 + (i % 3) * 26])}px`,
            rotate: `${-7 + i * 2.6}deg`,
            opacity: interpolate(frame, [8 + i * 6, 30 + i * 6], [0, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }),
          }}
        >
          <div style={{ margin: "26px 22px 0", height: 13, width: 110, background: "rgba(231,237,236,0.25)", borderRadius: 7 }} />
          {[...Array(7)].map((_, r) => (
            <div key={r} style={{ margin: "13px 22px 0", height: 7, width: 150 + ((r * 37) % 40), background: "rgba(231,237,236,0.12)", borderRadius: 4 }} />
          ))}
        </Interactive.Div>
      ))}
      <Interactive.Div name="Headline" style={{ fontSize: portrait ? 92 : 118, fontWeight: 750, letterSpacing: "-0.03em", position: "relative", ...fadeUp(frame, 14) }}>
        One CV for every job.
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "54%",
            height: 9,
            borderRadius: 5,
            background: C.danger,
            width: `${interpolate(frame, [78, 104], [0, 102], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE })}%`,
          }}
        />
      </Interactive.Div>
      <Interactive.Div name="Sub" style={{ fontSize: portrait ? 44 : 52, color: C.text2, marginTop: 34, ...fadeUp(frame, 108) }}>
        Sent everywhere. Landing nowhere.
      </Interactive.Div>
    </AbsoluteFill>
  );
};
