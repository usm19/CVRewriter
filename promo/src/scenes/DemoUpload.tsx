import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, EASE, Stage } from "../theme";
import { Phone, Mast, MiniCard, CardTitle, GBtn, MiniPage, Copy, Tap, usePortrait, Spinner } from "../ui";

/* Journey 1: upload once -> replica appears -> approve. */
export const DemoUpload: React.FC = () => {
  const frame = useCurrentFrame();
  const portrait = usePortrait();
  const pw = portrait ? 620 : 430;
  const u = pw / 390;
  const chipIn = interpolate(frame, [64, 78], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const scanning = frame > 84 && frame < 150;
  return (
    <Stage>
      <AbsoluteFill style={{ flexDirection: portrait ? "column" : "row", justifyContent: "center", alignItems: "center", gap: portrait ? 60 : 130, padding: portrait ? "110px 90px" : "0 130px" }}>
        <Copy portrait={portrait} from={4} title="Upload your CV. Once."
          sub="It is taken apart on your phone: your layout, your fonts, your words." />
        <div style={{ position: "relative" }}>
          <Phone w={pw} enter={10}>
            <Mast u={u} />
            <MiniCard u={u} from={20}>
              <CardTitle u={u}>Your CV, once</CardTitle>
              <div style={{ display: "flex", alignItems: "center", gap: 8 * u }}>
                <div style={{ border: `1.5px solid rgba(147,162,160,0.4)`, borderRadius: 10 * u, padding: `${9 * u}px ${14 * u}px`, fontSize: 13 * u, color: C.text, fontWeight: 600 }}>
                  Choose file
                </div>
                <div style={{ background: "rgba(70,200,207,0.14)", borderRadius: 999, padding: `${7 * u}px ${13 * u}px`, fontSize: 11.5 * u, color: C.text, opacity: chipIn, scale: String(chipIn), fontWeight: 550 }}>
                  Priya-Shah.pdf
                </div>
              </div>
              {scanning ? (
                <div style={{ display: "flex", alignItems: "center", gap: 7 * u, marginTop: 10 * u, color: C.text2, fontSize: 11 * u }}>
                  <Spinner size={11 * u} color={C.accent} />
                  Reading layout, fonts and colours
                </div>
              ) : null}
            </MiniCard>
            {frame > 150 ? (
              <MiniCard u={u} from={150} glow>
                <CardTitle u={u}>Check the replica</CardTitle>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <MiniPage u={u} w={150 * u} from={156} />
                </div>
                <div style={{ marginTop: 10 * u }}>
                  <GBtn u={u} pressAt={236}>Looks right, use it</GBtn>
                </div>
              </MiniCard>
            ) : null}
          </Phone>
          <Tap at={56} x={pw * 0.28} y={pw * 0.62} u={u} />
          <Tap at={236} x={pw * 0.42} y={pw * 1.72} u={u} />
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
