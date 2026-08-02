import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, EASE, grad } from "./theme";
import { GBtn, Mast, MiniCard, CardTitle, MiniPage, Phone, Spinner, Tap, TickMark } from "./ui";
import { BEATS } from "./timing";

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const io = (frame: number, from: number, dur = 18) =>
  interpolate(frame, [from, from + dur], [0, 1], { ...clamp, easing: EASE });

/* ---------- station 1: the old era ---------- */
export const HookWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const gone = io(frame, BEATS.upload.start - 14, 20);
  const pages = [
    { x: -640, y: -300, r: -9 }, { x: -400, y: 170, r: 4 }, { x: 210, y: -330, r: -3 },
    { x: 470, y: 150, r: 8 }, { x: -40, y: 300, r: -6 },
  ];
  return (
    <div style={{ position: "absolute", left: 0, top: 0, opacity: 1 - gone }}>
      {pages.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute", left: p.x, top: p.y + Math.sin((frame + i * 37) / 46) * 7, width: 240, height: 336,
            background: "#565b60", borderRadius: 8, rotate: `${p.r + Math.sin((frame + i * 61) / 74) * 1.5}deg`,
            boxShadow: "0 18px 50px rgba(0,0,0,0.45)", opacity: 0.55 - i * 0.05,
            translate: `${gone * (p.x * 1.1)}px ${gone * -140}px`,
          }}
        >
          <div style={{ padding: 18 }}>
            <div style={{ height: 12, width: "55%", background: "#787e85", borderRadius: 3 }} />
            {[...Array(8)].map((_, j) => (
              <div key={j} style={{ height: 6, width: `${62 + ((j * 29) % 32)}%`, background: "#6a7075", borderRadius: 3, marginTop: 11 }} />
            ))}
            <div style={{ marginTop: 22, fontSize: 15, fontWeight: 700, color: "#7d838a", letterSpacing: "0.04em" }}>THE SAME CV</div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ---------- station 2: the phone, one continuous journey ---------- */
const PHONE_W = 460;
const U = PHONE_W / 390;

/* phase container: slides in and out of the screen like real app views,
   always below the app's masthead */
const Phase: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const frame = useCurrentFrame();
  if (frame < from - 12 || frame > to + 16) return null;
  const enter = io(frame, from, 16);
  const leave = io(frame, to, 14);
  return (
    <div style={{ position: "absolute", inset: 0, paddingTop: 82 * U, opacity: enter * (1 - leave), translate: `0px ${(1 - enter) * 34 - leave * 30}px` }}>
      {children}
    </div>
  );
};

export const PhoneJourney: React.FC = () => {
  const frame = useCurrentFrame();
  const u = U;
  const B = BEATS;

  /* upload beat moments */
  const tapChoose = B.upload.vo + 34;
  const chipAt = tapChoose + 10;
  const readFrom = chipAt + 8;
  const pageAt = readFrom + 66;
  const approveAt = B.upload.end - 26;

  /* link beat moments */
  const URL = "fenwick.co.uk/jobs/team-leader";
  const typedN = Math.floor(interpolate(frame, [B.link.vo - 6, B.link.vo + B.link.voLen - 14], [0, URL.length], clamp));
  const tailorPress = B.link.end - 18;

  /* engine beat moments */
  const resultAt = B.engine.vo + 12;
  const statAt = resultAt + 16;
  const hlFrom = B.engine.vo + 62;          /* highlights ink in, staggered */
  const swapped = [1, 3, 5, 102, 104];
  const hlOn = swapped.filter((_, i) => frame >= hlFrom + i * 9);

  /* editor beat moments */
  const tapRow = B.editor.vo + 16;
  const sheetAt = tapRow + 10;
  const sheetGone = B.honesty.start + 4;

  return (
    <Phone w={PHONE_W} enter={B.upload.start - 4}>
      <Mast u={u} />

      {/* phase A: upload once */}
      <Phase from={B.upload.start + 6} to={B.link.start - 6}>
        <MiniCard u={u} from={B.upload.vo - 8}>
          <CardTitle u={u}>Your CV, once</CardTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 8 * u }}>
            <div style={{ border: `${1.5 * u}px solid rgba(147,162,160,0.5)`, borderRadius: 10 * u, padding: `${8 * u}px ${13 * u}px`, fontSize: 13 * u, fontWeight: 650, color: C.text, scale: String(1 - 0.07 * Math.max(0, 1 - Math.abs(frame - tapChoose - 3) / 5)) }}>
              Choose file
            </div>
            {frame >= chipAt ? (
              <div style={{ background: "rgba(70,200,207,0.14)", color: C.accent, borderRadius: 999, padding: `${6 * u}px ${11 * u}px`, fontSize: 12 * u, fontWeight: 650, opacity: io(frame, chipAt, 10) }}>
                Priya-Shah.pdf
              </div>
            ) : null}
          </div>
          {frame >= readFrom && frame < pageAt + 6 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 7 * u, marginTop: 11 * u, color: C.text2, fontSize: 11.5 * u, opacity: io(frame, readFrom, 8) * (1 - io(frame, pageAt - 4, 8)) }}>
              <Spinner size={11 * u} color={C.accent} /> Reading layout, fonts and colours
            </div>
          ) : null}
        </MiniCard>
        {frame >= pageAt ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * u }}>
            <MiniPage u={u} w={220 * u} from={pageAt} />
            <div style={{ opacity: io(frame, pageAt + 14, 12) }}>
              <GBtn u={u} pressAt={approveAt}>Looks right, use it</GBtn>
            </div>
          </div>
        ) : null}
        <Tap at={tapChoose} x={60 * u} y={150 * u} u={u} />
        <Tap at={approveAt} x={195 * u} y={548 * u} u={u} />
      </Phase>

      {/* phase B: paste the link */}
      <Phase from={B.link.start + 4} to={B.engine.vo + 8}>
        <MiniCard u={u} from={B.link.start + 6}>
          <CardTitle u={u}>Tailor to a job</CardTitle>
          <div style={{ background: C.surface2, borderRadius: 10 * u, padding: `${9 * u}px ${12 * u}px`, fontSize: 12.5 * u, color: C.text, minHeight: 34 * u, display: "flex", alignItems: "center" }}>
            {URL.slice(0, typedN)}
            <span style={{ width: 2 * u, height: 15 * u, background: C.accent, marginLeft: 2, opacity: frame % 18 < 9 ? 1 : 0 }} />
          </div>
          <div style={{ marginTop: 11 * u, display: "flex", justifyContent: "flex-end" }}>
            <GBtn u={u} pressAt={tailorPress} busyUntil={resultAt}>Tailor my CV</GBtn>
          </div>
        </MiniCard>
        <Tap at={tailorPress} x={300 * u} y={192 * u} u={u} />
      </Phase>

      {/* phase C: the result - stays up through editor and honesty. The
          header steps aside while the camera is inside the page. */}
      <Phase from={resultAt} to={B.private.start - 8}>
        <div style={{ opacity: Math.max(0, Math.min(1, 1 - io(frame, B.editor.start + 4, 14) + io(frame, B.honesty.start + 8, 16))) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 * u, marginBottom: 9 * u, opacity: io(frame, resultAt + 2, 12) }}>
            <div style={{ width: 20 * u, height: 20 * u, borderRadius: 7 * u, background: grad, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TickMark size={11 * u} color={C.ink} show />
            </div>
            <div style={{ fontSize: 14 * u, fontWeight: 700, color: C.text }}>Team Leader, Fenwick</div>
          </div>
          <div style={{ display: "flex", gap: 6 * u, marginBottom: 11 * u }}>
            {[["12", "asks covered"], ["7", "reworded"], ["2", "to weigh up"]].map(([n, l], i) => (
              <div key={l} style={{ background: C.surface, borderRadius: 999, padding: `${5 * u}px ${10 * u}px`, fontSize: 10.5 * u, color: C.text2, scale: String(io(frame, statAt + i * 8, 12)), opacity: io(frame, statAt + i * 8, 10) }}>
                <b style={{ color: i === 2 ? C.danger : C.accent, marginRight: 4 * u, fontSize: 12 * u }}>{n}</b>{l}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <MiniPage
            u={u} w={256 * u} swapped={hlOn} from={resultAt + 10}
            glowRow={5}
            glowPulse={frame >= hlFrom + 18 ? 0.75 + 0.25 * Math.sin(frame / 6) : 0}
          />
        </div>
        <Tap at={tapRow} x={195 * u} y={240 * u} u={u} />

        {/* the editor sheet, rising inside the phone */}
        {frame >= sheetAt - 8 && frame < sheetGone + 14 ? (
          <div
            style={{
              position: "absolute", left: -16 * u, right: -16 * u, bottom: -46 * u,
              background: C.surface, borderRadius: `${18 * u}px ${18 * u}px 0 0`, padding: `${14 * u}px ${16 * u}px ${20 * u}px`,
              boxShadow: `0 ${-8 * u}px ${30 * u}px rgba(0,0,0,0.45)`,
              translate: `0px ${(1 - io(frame, sheetAt, 16)) * 180 + io(frame, sheetGone, 12) * 200}px`,
            }}
          >
            <div style={{ fontSize: 12.5 * u, fontWeight: 700, color: C.text, marginBottom: 8 * u }}>This sentence was reworded</div>
            <div style={{ background: C.surface2, borderRadius: 8 * u, padding: `${7 * u}px ${9 * u}px`, fontSize: 10 * u, color: C.text2, marginBottom: 8 * u }}>
              YOUR ORIGINAL · Handle customer care questions face to face.
            </div>
            <div style={{ display: "flex", gap: 6 * u }}>
              <div style={{ border: `${1.2 * u}px solid rgba(147,162,160,0.4)`, borderRadius: 9 * u, padding: `${6 * u}px ${10 * u}px`, fontSize: 10.5 * u, color: C.text, fontWeight: 650 }}>Try another wording</div>
              <div style={{ border: `${1.2 * u}px solid rgba(147,162,160,0.4)`, borderRadius: 9 * u, padding: `${6 * u}px ${10 * u}px`, fontSize: 10.5 * u, color: C.text2 }}>Put it back</div>
              <div style={{ background: grad, borderRadius: 9 * u, padding: `${6 * u}px ${12 * u}px`, fontSize: 10.5 * u, color: C.ink, fontWeight: 700 }}>Done</div>
            </div>
          </div>
        ) : null}
      </Phase>

      {/* phase E: honesty - the gaps card slides under the page */}
      <Phase from={B.honesty.vo + 6} to={B.private.start - 8}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 34 * u }}>
          <MiniCard u={u} from={B.honesty.vo + 8}>
            <div style={{ fontSize: 11.5 * u, fontWeight: 700, color: C.text, marginBottom: 7 * u }}>Worth knowing before you apply</div>
            {["first aid certificate", "food hygiene qualification"].map((g, i) => (
              <div key={g} style={{ display: "inline-block", background: "rgba(226,138,123,0.14)", color: C.danger, borderRadius: 999, padding: `${5 * u}px ${10 * u}px`, fontSize: 10.5 * u, fontWeight: 650, marginRight: 6 * u, opacity: io(frame, B.honesty.vo + 16 + i * 10, 12) }}>
                {g}
              </div>
            ))}
          </MiniCard>
        </div>
      </Phase>
    </Phone>
  );
};

/*
 * The magnifier: while the camera is inside the page, this screen-space
 * callout shows the actual sentence - strike, swap, regenerate - at full
 * reading size. It never clips because it lives above the world.
 */
export const LensHud: React.FC<{ portrait: boolean }> = ({ portrait }) => {
  const frame = useCurrentFrame();
  const B = BEATS;
  const from = B.editor.vo + 30;
  const out = B.honesty.start - 12;
  if (frame < from - 10 || frame > out + 16) return null;
  const on = io(frame, from, 18) * (1 - io(frame, out, 12));
  const regenAt = B.editor.vo + 118;
  const showAlt = frame >= regenAt + 8;
  const press = 1 - 0.06 * Math.max(0, 1 - Math.abs(frame - regenAt - 3) / 5);
  const strike = interpolate(frame, [from + 16, from + 34], [0, 100], { ...clamp, easing: EASE });
  const fs = portrait ? 34 : 30;
  return (
    <div
      style={{
        position: "absolute",
        ...(portrait
          ? { left: 90, right: 90, top: 960 }
          : { right: 110, top: "50%", width: 640, transform: "translateY(-50%)" }),
        background: "rgba(21,32,32,0.96)", borderRadius: 22, padding: portrait ? "30px 34px" : "28px 32px",
        boxShadow: "0 24px 70px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(70,200,207,0.4)",
        opacity: on, translate: `0px ${(1 - on) * 30}px`,
      }}
    >
      <div style={{ fontSize: portrait ? 17 : 16, fontWeight: 700, letterSpacing: "0.08em", color: C.accent, marginBottom: 14 }}>WHAT CHANGED, AND WHY</div>
      {(() => {
        const p2 = showAlt ? io(frame, regenAt + 8, 10) : 0;
        const sentence = (word: string) => (
          <div style={{ fontSize: fs, lineHeight: 1.5, color: C.text2 }}>
            Handle{" "}
            <span style={{ position: "relative", whiteSpace: "nowrap" }}>
              customer care
              <span style={{ position: "absolute", left: 0, top: "54%", height: 3.5, borderRadius: 2, background: C.danger, width: `${strike}%` }} />
            </span>{" "}
            <span style={{ color: C.accent, fontWeight: 750 }}>{word}</span> questions face to face.
          </div>
        );
        return (
          <div style={{ position: "relative" }}>
            <div style={{ opacity: 1 - p2 }}>{sentence("customer service")}</div>
            <div style={{ position: "absolute", inset: 0, opacity: p2 }}>{sentence("customer experience")}</div>
          </div>
        );
      })()}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, border: "1.5px solid rgba(147,162,160,0.4)", borderRadius: 12, padding: "10px 18px", fontSize: portrait ? 24 : 22, color: C.text, fontWeight: 650, scale: String(press) }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth={2.6} strokeLinecap="round" style={{ rotate: `${Math.min(360, Math.max(0, (frame - regenAt) * 24))}deg` }}>
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5" />
          </svg>
          Try another wording · {showAlt ? "2 of 5" : "1 of 5"}
          <Tap at={regenAt} x={34} y={26} u={1.4} />
        </div>
        <div style={{ fontSize: portrait ? 22 : 20, color: C.text2 }}>the listing says “customer service”</div>
      </div>
    </div>
  );
};

/* ---------- station 3: private by design ---------- */
export const LockWorld: React.FC<{ portrait: boolean }> = ({ portrait }) => {
  const frame = useCurrentFrame();
  const B = BEATS;
  const from = B.private.start + 12;
  const draw = interpolate(frame, [from + 6, from + 34], [90, 0], { ...clamp, easing: EASE });
  const ring = (frame - from) % 84;
  return (
    <div style={{ position: "absolute", left: 5200, top: portrait ? -160 : -80, translate: "-50% -50%", display: "flex", flexDirection: "column", alignItems: "center", gap: 34, width: 760 }}>
      <div style={{ position: "relative", width: 168, height: 168, borderRadius: 46, background: grad, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 26px 80px rgba(59,208,160,0.4)", opacity: io(frame, from, 18), scale: String(0.8 + 0.2 * io(frame, from, 22)) }}>
        <svg width={84} height={84} viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" strokeDasharray={58} strokeDashoffset={0} />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeDasharray={90} strokeDashoffset={draw} />
        </svg>
        <div style={{ position: "absolute", inset: -14, borderRadius: 56, border: "2px solid rgba(70,200,207,0.5)", opacity: Math.max(0, 0.7 - ring / 60), scale: String(1 + ring / 90) }} />
      </div>
      {[["John’s space", 26], ["David’s space", 40]].map(([name, d], i) => (
        <div key={String(name)} style={{ display: "flex", alignItems: "center", gap: 16, background: C.surface, borderRadius: 18, padding: "20px 30px", width: 560, opacity: io(frame, from + Number(d), 16), translate: `0px ${(1 - io(frame, from + Number(d), 18)) * 30}px` }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(70,200,207,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth={2.2} strokeLinecap="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </div>
          <div style={{ fontSize: 26, fontWeight: 650, color: C.text }}>{name}</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
            {[...Array(6)].map((_, j) => (
              <div key={j} style={{ width: 9, height: 9, borderRadius: "50%", background: C.text2, opacity: frame > from + Number(d) + 8 + j * 3 ? 0.9 : 0.2 }} />
            ))}
          </div>
          <div style={{ fontSize: 15, color: i === 0 ? C.gradA : C.text2, fontWeight: 650, marginLeft: 14 }}>encrypted</div>
        </div>
      ))}
    </div>
  );
};

/* ---------- station 4: PDF and home screen ---------- */
export const FinishWorld: React.FC<{ portrait: boolean }> = ({ portrait }) => {
  const frame = useCurrentFrame();
  const B = BEATS;
  const from = B.finish.start + 12;
  const iconAt = from + 58;
  return (
    <div style={{ position: "absolute", left: 7800, top: portrait ? 40 : 60, translate: "-50% -50%", display: "flex", flexDirection: portrait ? "column" : "row", alignItems: "center", justifyContent: "center", gap: portrait ? 46 : 90, width: portrait ? 820 : 1100 }}>
      <div style={{ position: "relative", opacity: io(frame, from, 18), translate: `0px ${(1 - io(frame, from, 20)) * 36}px` }}>
        <div style={{ width: 300, height: 424, background: "#fff", borderRadius: 10, boxShadow: "0 26px 70px rgba(0,0,0,0.5)", padding: 22 }}>
          <div style={{ height: 13, width: "52%", background: "#24272b", borderRadius: 3 }} />
          {[...Array(9)].map((_, i) => (
            <div key={i} style={{ height: 6.5, width: `${58 + ((i * 31) % 36)}%`, background: [1, 4, 6].includes(i) ? C.gradA : "#c9ced4", borderRadius: 3, marginTop: 13 }} />
          ))}
        </div>
        <div style={{ position: "absolute", right: -18, bottom: -18, background: grad, color: C.ink, borderRadius: 999, padding: "10px 18px", fontSize: 18, fontWeight: 750, display: "flex", alignItems: "center", gap: 8, opacity: io(frame, from + 26, 14), scale: String(0.7 + 0.3 * io(frame, from + 26, 16)) }}>
          <TickMark size={16} color={C.ink} drawFrom={from + 30} /> One page PDF
        </div>
      </div>
      <div style={{ background: "rgba(4,9,10,0.65)", borderRadius: 34, padding: 26, opacity: io(frame, from + 34, 18), translate: `0px ${(1 - io(frame, from + 34, 20)) * 36}px` }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 74px)", gap: 20 }}>
          {[...Array(9)].map((_, i) =>
            i === 4 ? (
              <div key={i} style={{ position: "relative", width: 74, height: 74, borderRadius: 20, background: grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23, fontWeight: 800, color: C.ink, scale: String(io(frame, iconAt, 16)), boxShadow: "0 12px 34px rgba(59,208,160,0.45)" }}>
                CV.
                <Tap at={iconAt + 16} x={37} y={37} u={1} />
              </div>
            ) : (
              <div key={i} style={{ width: 74, height: 74, borderRadius: 20, background: "rgba(231,237,236,0.10)" }} />
            ),
          )}
        </div>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 15, color: C.text2, fontWeight: 550 }}>Add to Home Screen</div>
      </div>
    </div>
  );
};

/* ---------- station 5: the send-off ---------- */
export const CtaWorld: React.FC<{ portrait: boolean }> = ({ portrait }) => {
  const frame = useCurrentFrame();
  const B = BEATS;
  const from = B.cta.start + 10;
  return (
    <div style={{ position: "absolute", left: 10400, top: 0, translate: "-50% -50%", display: "flex", flexDirection: "column", alignItems: "center", gap: portrait ? 40 : 34, width: 900 }}>
      <div style={{ fontSize: portrait ? 118 : 128, fontWeight: 800, letterSpacing: "-0.04em", color: C.text, opacity: io(frame, from, 22), scale: String(0.92 + 0.08 * io(frame, from, 26)) }}>
        CVRewriter<span style={{ background: grad, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>.</span>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
        {["Free forever", "No accounts", "Runs on your phone"].map((t, i) => (
          <div key={t} style={{ background: C.surface, borderRadius: 999, padding: "12px 24px", fontSize: 21, fontWeight: 650, color: C.text2, opacity: io(frame, from + 18 + i * 8, 14), translate: `0px ${(1 - io(frame, from + 18 + i * 8, 16)) * 22}px` }}>
            {t}
          </div>
        ))}
      </div>
      <div style={{ position: "relative", borderRadius: 999, padding: 2.5, background: grad, opacity: io(frame, from + 44, 18), scale: String(0.94 + 0.06 * io(frame, from + 44, 20)) }}>
        <div style={{ background: "#0b1213", borderRadius: 999, padding: "18px 40px", fontSize: portrait ? 33 : 36, fontWeight: 700, color: C.text }}>
          usm19.github.io<span style={{ color: C.accent }}>/CVRewriter</span>
        </div>
      </div>
    </div>
  );
};
