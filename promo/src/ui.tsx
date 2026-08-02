import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, EASE, grad } from "./theme";

export const usePortrait = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};

/* A finger-tap indicator: ring that lands and ripples at a moment. */
export const Tap: React.FC<{ at: number; x: number; y: number; u: number }> = ({ at, x, y, u }) => {
  const frame = useCurrentFrame();
  const life = frame - at;
  if (life < 0 || life > 26) return null;
  return (
    <div
      style={{
        position: "absolute", left: x - 22 * u, top: y - 22 * u, width: 44 * u, height: 44 * u, borderRadius: "50%",
        border: `${4 * u}px solid rgba(231,237,236,0.9)`,
        scale: String(interpolate(life, [0, 8, 26], [0.5, 1, 1.5], { easing: EASE })),
        opacity: interpolate(life, [0, 6, 26], [0, 0.95, 0], { easing: Easing.linear }),
      }}
    />
  );
};

/* The device. Children render inside the screen at "device pixels" times u. */
export const Phone: React.FC<{ w: number; children: React.ReactNode; enter?: number }> = ({ w, children, enter = 0 }) => {
  const frame = useCurrentFrame();
  const u = w / 390;
  return (
    <div
      style={{
        width: w + 24 * u, height: (w * 2.05) + 24 * u, borderRadius: 58 * u, background: "#04090a",
        boxShadow: "0 40px 120px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(231,237,236,0.08)",
        padding: 12 * u, position: "relative",
        opacity: interpolate(frame, [enter, enter + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }),
        translate: `0px ${interpolate(frame, [enter, enter + 26], [70, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE })}px`,
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: 47 * u, background: C.bg, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", top: 10 * u, left: "50%", translate: "-50% 0", width: 96 * u, height: 22 * u, borderRadius: 12 * u, background: "#04090a", zIndex: 5 }} />
        <div
          style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(${300 * u}px ${220 * u}px at 10% -4%, rgba(59,208,160,0.14), transparent 60%),
                         radial-gradient(${280 * u}px ${200 * u}px at 110% 30%, rgba(84,170,242,0.10), transparent 65%)`,
          }}
        />
        <div style={{ position: "absolute", inset: 0, padding: `${46 * u}px ${16 * u}px 0` }}>{children}</div>
      </div>
    </div>
  );
};

export const Mast: React.FC<{ u: number }> = ({ u }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 * u }}>
    <div style={{ fontSize: 19 * u, fontWeight: 750, letterSpacing: "-0.03em", color: C.text }}>
      CVRewriter<span style={{ color: C.accent }}>.</span>
    </div>
    <div style={{ display: "flex", gap: 8 * u }}>
      {[0, 1].map((i) => (
        <div key={i} style={{ width: 26 * u, height: 26 * u, borderRadius: 8 * u, background: C.surface2 }} />
      ))}
    </div>
  </div>
);

export const MiniCard: React.FC<{ u: number; from?: number; children: React.ReactNode; glow?: boolean }> = ({ u, from = 0, children, glow }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        background: C.surface, borderRadius: 16 * u, padding: 14 * u, marginBottom: 12 * u,
        boxShadow: glow ? `0 0 0 ${1.5 * u}px rgba(70,200,207,0.5), 0 ${10 * u}px ${30 * u}px rgba(0,0,0,0.4)` : `0 ${8 * u}px ${24 * u}px rgba(0,0,0,0.35)`,
        opacity: interpolate(frame, [from, from + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }),
        translate: `0px ${interpolate(frame, [from, from + 20], [26, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE })}px`,
      }}
    >
      {children}
    </div>
  );
};

export const CardTitle: React.FC<{ u: number; children: React.ReactNode; done?: boolean }> = ({ u, children, done }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 * u, marginBottom: 10 * u }}>
    <div style={{ width: 22 * u, height: 22 * u, borderRadius: 7 * u, background: done ? grad : "rgba(70,200,207,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <TickMark size={12 * u} color={done ? C.ink : C.accent} show />
    </div>
    <div style={{ fontSize: 14.5 * u, fontWeight: 650, color: C.text }}>{children}</div>
  </div>
);

export const TickMark: React.FC<{ size: number; color: string; show?: boolean; drawFrom?: number }> = ({ size, color, show, drawFrom }) => {
  const frame = useCurrentFrame();
  const p = drawFrom === undefined ? (show ? 1 : 0) : interpolate(frame, [drawFrom, drawFrom + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" strokeDasharray={24} strokeDashoffset={24 * (1 - p)} />
    </svg>
  );
};

export const GBtn: React.FC<{ u: number; children: React.ReactNode; pressAt?: number; busyUntil?: number }> = ({ u, children, pressAt, busyUntil }) => {
  const frame = useCurrentFrame();
  const press = pressAt === undefined ? 1 : interpolate(frame, [pressAt, pressAt + 5, pressAt + 12], [1, 0.93, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const busy = pressAt !== undefined && busyUntil !== undefined && frame > pressAt + 8 && frame < busyUntil;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 7 * u, background: grad, color: C.ink, borderRadius: 12 * u, padding: `${10 * u}px ${16 * u}px`, fontSize: 14 * u, fontWeight: 650, scale: String(press), boxShadow: `0 ${6 * u}px ${20 * u}px rgba(59,208,160,0.35)` }}>
      {busy ? <Spinner size={13 * u} color={C.ink} /> : null}
      {children}
    </div>
  );
};

export const Spinner: React.FC<{ size: number; color: string }> = ({ size, color }) => {
  const frame = useCurrentFrame();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" style={{ rotate: `${frame * 14}deg` }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
};

/* A miniature CV page. lines marks which rows show swapped (teal) text.
   glowRow highlights one main-column row exactly, at glowPulse opacity. */
export const MiniPage: React.FC<{ u: number; w: number; swapped?: number[]; from?: number; glowRow?: number; glowPulse?: number }> = ({ u, w, swapped = [], from = 0, glowRow, glowPulse = 0 }) => {
  const frame = useCurrentFrame();
  const h = w * 1.41;
  /* main-column geometry: 10u pad, 7u title with 8u margin, rows 3.4u tall
     with a 6u gap - row i starts at 25u + i * 9.4u */
  const glowTop = 25 * u + (glowRow ?? 0) * 9.4 * u;
  return (
    <div
      style={{
        width: w, height: h, background: "#fff", borderRadius: 8 * u, display: "flex", overflow: "hidden",
        boxShadow: `0 ${10 * u}px ${34 * u}px rgba(0,0,0,0.45)`,
        opacity: interpolate(frame, [from, from + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }),
        translate: `0px ${interpolate(frame, [from, from + 22], [26, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE })}px`,
      }}
    >
      <div style={{ width: "30%", background: "#1e3a4c", padding: `${10 * u}px ${6 * u}px` }}>
        {[...Array(7)].map((_, i) => (
          <div key={i} style={{ height: 3.4 * u, borderRadius: 2 * u, marginBottom: 6 * u, width: `${58 + ((i * 23) % 30)}%`, background: swapped.includes(100 + i) ? C.gradA : "rgba(232,238,242,0.65)" }} />
        ))}
      </div>
      <div style={{ flex: 1, padding: `${10 * u}px ${8 * u}px`, position: "relative" }}>
        <div style={{ height: 7 * u, width: "52%", background: "#24272b", borderRadius: 3 * u, marginBottom: 8 * u }} />
        {[...Array(9)].map((_, i) => (
          <div key={i} style={{ height: 3.4 * u, borderRadius: 2 * u, marginTop: 6 * u, width: `${60 + ((i * 31) % 36)}%`, background: swapped.includes(i) ? C.gradA : "#c9ced4" }} />
        ))}
        {glowRow !== undefined && glowPulse > 0 ? (
          <div
            style={{
              position: "absolute", left: 4 * u, right: 6 * u, top: glowTop - 3.2 * u, height: 9.8 * u, borderRadius: 3 * u,
              background: "rgba(70,200,207,0.30)", boxShadow: `0 0 0 ${1.6 * u}px rgba(70,200,207,0.35)`,
              opacity: glowPulse,
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

/* A proposal row: tick draws, old word gets struck, new word lands. */
export const PropRow: React.FC<{ u: number; from: number; old: string; neu: string }> = ({ u, from, old, neu }) => {
  const frame = useCurrentFrame();
  const strike = interpolate(frame, [from + 10, from + 22], [0, 104], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const boxIn = interpolate(frame, [from, from + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.spring({ damping: 13 }) });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 * u, padding: `${7 * u}px 0`, opacity: interpolate(frame, [from - 6, from + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
      <div style={{ width: 17 * u, height: 17 * u, borderRadius: 5 * u, background: grad, display: "flex", alignItems: "center", justifyContent: "center", scale: String(boxIn) }}>
        <TickMark size={11 * u} color={C.ink} drawFrom={from + 8} />
      </div>
      <div style={{ fontSize: 12.5 * u, color: C.text2 }}>
        <span style={{ position: "relative" }}>
          {old}
          <span style={{ position: "absolute", left: 0, top: "52%", height: 2.4 * u, borderRadius: 2 * u, background: C.danger, width: `${strike}%` }} />
        </span>
        <span style={{ color: C.text2, margin: `0 ${5 * u}px`, fontSize: 10 * u }}>→</span>
        <span style={{ color: C.accent, fontWeight: 750 }}>{neu}</span>
      </div>
    </div>
  );
};

/* Copy block that holds long enough to read, adapting to orientation. */
export const Copy: React.FC<{ from: number; title: string; sub?: string; portrait: boolean }> = ({ from, title, sub, portrait }) => {
  const frame = useCurrentFrame();
  const a = (d: number) => ({
    opacity: interpolate(frame, [from + d, from + d + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }),
    translate: `0px ${interpolate(frame, [from + d, from + d + 24], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE })}px`,
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: portrait ? 22 : 30, alignItems: portrait ? "center" : "flex-start", textAlign: portrait ? "center" : "left" }}>
      <div style={{ fontSize: portrait ? 76 : 92, fontWeight: 750, letterSpacing: "-0.03em", lineHeight: 1.08, color: C.text, maxWidth: portrait ? 900 : 640, ...a(0) }}>{title}</div>
      {sub ? <div style={{ fontSize: portrait ? 42 : 46, color: C.text2, lineHeight: 1.35, maxWidth: portrait ? 860 : 600, ...a(16) }}>{sub}</div> : null}
    </div>
  );
};
