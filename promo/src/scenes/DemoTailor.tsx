import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, Stage } from "../theme";
import { Phone, Mast, MiniCard, CardTitle, GBtn, PropRow, Copy, Tap, usePortrait } from "../ui";

const URL_TEXT = "greatjobs.co.uk/team-leader";

/* Journey 2: paste the link -> tailor -> tick the words. */
export const DemoTailor: React.FC = () => {
  const frame = useCurrentFrame();
  const portrait = usePortrait();
  const pw = portrait ? 620 : 430;
  const u = pw / 390;
  const typed = Math.round(interpolate(frame, [26, 86], [0, URL_TEXT.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <Stage>
      <AbsoluteFill style={{ flexDirection: portrait ? "column" : "row", justifyContent: "center", alignItems: "center", gap: portrait ? 60 : 130, padding: portrait ? "110px 90px" : "0 130px" }}>
        <Copy portrait={portrait} from={4} title="Paste the job link."
          sub="Then tick only the word changes you like. Nothing moves without you." />
        <div style={{ position: "relative" }}>
          <Phone w={pw} enter={0}>
            <Mast u={u} />
            <MiniCard u={u} from={8}>
              <CardTitle u={u}>Tailor to a job</CardTitle>
              <div style={{ display: "flex", gap: 7 * u }}>
                <div style={{ flex: 1, background: C.surface2, borderRadius: 10 * u, padding: `${9 * u}px ${12 * u}px`, fontSize: 11.5 * u, color: C.text, whiteSpace: "nowrap", overflow: "hidden" }}>
                  {URL_TEXT.slice(0, typed)}
                  <span style={{ opacity: frame % 18 < 9 && typed < URL_TEXT.length ? 1 : 0 }}>|</span>
                </div>
                <GBtn u={u} pressAt={100} busyUntil={140}>Tailor</GBtn>
              </div>
            </MiniCard>
            {frame > 144 ? (
              <MiniCard u={u} from={144} glow>
                <CardTitle u={u} done>Team Leader, Fenwick</CardTitle>
                <div style={{ fontSize: 10.5 * u, fontWeight: 700, color: C.accent, margin: `${4 * u}px 0` }}>
                  Match the listing's wording
                </div>
                <PropRow u={u} from={156} old="shift planning" neu="rotas" />
                <PropRow u={u} from={186} old="customer care" neu="customer service" />
                <PropRow u={u} from={216} old="stock counts" neu="stocktakes" />
                <div style={{ marginTop: 10 * u }}>
                  <GBtn u={u} pressAt={280}>Save as PDF</GBtn>
                </div>
              </MiniCard>
            ) : null}
          </Phone>
          <Tap at={100} x={pw * 0.86} y={pw * 0.5} u={u} />
          <Tap at={280} x={pw * 0.36} y={pw * 1.62} u={u} />
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
