import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE, Stage } from "./theme";
import { usePortrait } from "./ui";
import { Headline, Particles } from "./kinetic";
import { HookWorld, PhoneJourney, LensHud, LockWorld, FinishWorld, CtaWorld } from "./stations";
import { BEATS, TOTAL } from "./timing";

export const FILM_DURATION = TOTAL;

/*
 * One world, one camera. The stations live side by side in a long space and
 * the camera glides between them - pushing into the phone for detail,
 * pulling out for breath - so the film flows instead of cutting.
 */
type Key = { t: number; x: number; y: number; s: number };
type Target = { x: number; y: number; s: number };

const TARGETS: Record<"wide" | "tall", Record<string, Target>> = {
  wide: {
    hook: { x: 0, y: -10, s: 1.0 },
    upload: { x: 2280, y: 90, s: 1.0 },
    link: { x: 2600, y: -190, s: 2.05 },
    engine: { x: 2470, y: 110, s: 1.1 },
    editor: { x: 2610, y: -20, s: 2.85 },
    honesty: { x: 2760, y: 130, s: 1.02 },
    private: { x: 5200, y: -80, s: 1.0 },
    finish: { x: 7440, y: 60, s: 1.0 },
    cta: { x: 10400, y: 0, s: 1.0 },
  },
  tall: {
    hook: { x: 0, y: -10, s: 1.0 },
    upload: { x: 2600, y: 55, s: 1.3 },
    link: { x: 2600, y: -150, s: 2.3 },
    engine: { x: 2600, y: 50, s: 1.26 },
    editor: { x: 2600, y: 40, s: 2.5 },
    honesty: { x: 2600, y: 55, s: 1.24 },
    private: { x: 5200, y: -140, s: 1.28 },
    finish: { x: 7800, y: 40, s: 1.24 },
    cta: { x: 10400, y: -30, s: 1.12 },
  },
};

/* Every beat gets an arrive key and a hold key, so the camera glides for
   ~0.8s and then rests with the subject - never drifting through nowhere. */
const keysFor = (portrait: boolean): Key[] => {
  const T = TARGETS[portrait ? "tall" : "wide"];
  const keys: Key[] = [
    { t: 0, ...T.hook },
    { t: BEATS.upload.start - 8, ...T.hook, s: T.hook.s * 1.07 },
  ];
  for (const b of ["upload", "link", "engine", "editor", "honesty", "private", "finish", "cta"] as const) {
    keys.push({ t: BEATS[b].start + 20, ...T[b] });
    keys.push({ t: BEATS[b].end - 6, ...T[b] });
  }
  keys.push({ t: TOTAL - 6, ...T.cta, s: T.cta.s * 1.07 });
  return keys;
};

const useCamera = (portrait: boolean) => {
  const frame = useCurrentFrame();
  const keys = keysFor(portrait);
  const ts = keys.map((k) => k.t);
  const opt = { easing: EASE, extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
  const x = interpolate(frame, ts, keys.map((k) => k.x), opt) + Math.sin(frame / 97) * 5;
  const y = interpolate(frame, ts, keys.map((k) => k.y), opt) + Math.cos(frame / 83) * 4;
  const s = interpolate(frame, ts, keys.map((k) => k.s), opt) * (1 + 0.004 * Math.sin(frame / 61));
  return { x, y, s };
};

/* ---------- screen-space copy, one voice per beat ---------- */
const Hud: React.FC<{ portrait: boolean }> = ({ portrait }) => {
  const B = BEATS;
  const frame = useCurrentFrame();
  const off = (from: number, out: number) => frame < from - 10 || frame > out + 28;
  const side = (from: number, out: number, title: string, sub?: string) =>
    off(from, out) ? null : portrait ? (
      <div style={{ position: "absolute", left: 70, right: 70, top: 130, display: "flex", justifyContent: "center" }}>
        <Headline from={from} out={out} title={title} sub={sub} portrait align="center" width={940} />
      </div>
    ) : (
      <div style={{ position: "absolute", left: 120, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
        <Headline from={from} out={out} title={title} sub={sub} portrait={false} width={640} />
      </div>
    );
  const lower = (from: number, out: number, title: string, sub?: string) => off(from, out) ? null : (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: portrait ? 170 : 90, display: "flex", justifyContent: "center" }}>
      <div style={{ background: "rgba(8,14,14,0.74)", borderRadius: 26, padding: "26px 46px", backdropFilter: "blur(8px)" }}>
        <Headline from={from} out={out} title={title} sub={sub} portrait={portrait} align="center" width={portrait ? 900 : 1060} small />
      </div>
    </div>
  );
  const centre = (from: number, out: number, title: string, sub?: string) => off(from, out) ? null : (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ background: "radial-gradient(closest-side, rgba(6,11,11,0.82), transparent)", padding: "90px 130px" }}>
        <Headline from={from} out={out} title={title} sub={sub} portrait={portrait} align="center" width={portrait ? 940 : 1200} />
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {centre(B.hook.start + 6, B.upload.start - 12, "One CV for every job?", "There’s a smarter way.")}
      {side(B.upload.vo, B.link.start - 8, "Upload it once.", "Layout, fonts, words — kept exactly.")}
      {lower(B.link.vo, B.engine.start + 8, "Paste the job link.", "Any listing, anywhere.")}
      {side(B.engine.vo + 10, B.editor.start - 8, "Reworded to fit. In your voice.", "Proper British English. Nothing invented.")}
      {lower(B.editor.vo, B.honesty.start - 8, "You have the final say.", "Edit it · Try another wording · Put it back")}
      {side(B.honesty.vo, B.private.start - 8, "It tells you straight.", "Gaps are flagged, never papered over.")}
      {side(B.private.vo, B.finish.start - 8, "Private by design.", "Encrypted on your device. No accounts, no servers.")}
      {side(B.finish.vo, B.cta.start - 8, "One page. One tap.", "Save as PDF · Add to Home Screen")}
    </AbsoluteFill>
  );
};

/* ---------- sound: narration plus instrument-free foley ---------- */
const VOICE: [keyof typeof BEATS, string][] = [
  ["hook", "vo-hook.wav"], ["upload", "vo-upload.wav"], ["link", "vo-link.wav"],
  ["engine", "vo-engine.wav"], ["editor", "vo-editor.wav"], ["honesty", "vo-honesty.wav"],
  ["private", "vo-private.wav"], ["finish", "vo-finish.wav"], ["cta", "vo-cta.wav"],
];

const Sound: React.FC = () => {
  const B = BEATS;
  const fx = (file: string, at: number, volume: number, key: string) => (
    <Sequence key={key} from={at} durationInFrames={40}>
      <Audio src={staticFile(`audio/${file}`)} volume={volume} />
    </Sequence>
  );
  return (
    <>
      {VOICE.map(([beat, file]) => (
        <Sequence key={file} from={B[beat].vo} durationInFrames={B[beat].voLen + 12}>
          <Audio src={staticFile(`audio/${file}`)} />
        </Sequence>
      ))}
      {(["upload", "link", "engine", "editor", "honesty", "private", "finish", "cta"] as const).map((b) =>
        fx("fx-whoosh.wav", B[b].start - 4, 0.32, `wh-${b}`),
      )}
      {fx("fx-tap.wav", B.upload.vo + 34, 0.55, "tap-choose")}
      {fx("fx-tap.wav", B.upload.end - 26, 0.55, "tap-approve")}
      {fx("fx-tap.wav", B.link.end - 18, 0.6, "tap-tailor")}
      {fx("fx-tap.wav", B.editor.vo + 16, 0.6, "tap-row")}
      {fx("fx-tap.wav", B.editor.vo + 118, 0.55, "tap-regen")}
      {fx("fx-tap.wav", B.finish.start + 86, 0.55, "tap-icon")}
      {fx("fx-slide.wav", B.upload.vo + 44, 0.5, "slide-chip")}
      {fx("fx-slide.wav", B.editor.vo + 26, 0.55, "slide-sheet")}
      {fx("fx-slide.wav", B.finish.start + 12, 0.5, "slide-pdf")}
      {fx("fx-ink.wav", B.engine.vo + 62, 0.6, "ink-1")}
      {fx("fx-ink.wav", B.engine.vo + 80, 0.5, "ink-2")}
      {[0, 1, 2].map((i) => fx("fx-tick.wav", B.engine.vo + 28 + i * 8, 0.55, `tick-${i}`))}
      {fx("fx-tick.wav", B.finish.start + 42, 0.6, "tick-pdf")}
    </>
  );
};

/* ---------- the film ---------- */
export const Film: React.FC = () => {
  const portrait = usePortrait();
  const { width, height } = useVideoConfig();
  const cam = useCamera(portrait);
  return (
    <Stage>
      <Particles camX={cam.x} />
      <AbsoluteFill
        style={{
          transformOrigin: "0 0",
          transform: `translate(${width / 2 - cam.x * cam.s}px, ${height / 2 - cam.y * cam.s}px) scale(${cam.s})`,
        }}
      >
        <HookWorld />
        <div style={{ position: "absolute", left: 2600, top: 120, translate: "-50% -50%" }}>
          <PhoneJourney />
        </div>
        <LockWorld portrait={portrait} />
        <FinishWorld portrait={portrait} />
        <CtaWorld portrait={portrait} />
      </AbsoluteFill>
      <Hud portrait={portrait} />
      <LensHud portrait={portrait} />
      <Sound />
      {/* soft vignette keeps the eye centred */}
      <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(120% 120% at 50% 50%, transparent 62%, ${C.bg} 130%)` }} />
    </Stage>
  );
};
