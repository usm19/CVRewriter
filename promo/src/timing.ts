/*
 * The film is timed around the narration. Each beat is lead-in + spoken
 * line + breathing room, so nothing ever flashes past the viewer.
 */
export const FPS = 30;

const VO_SECONDS: Record<string, number> = {
  hook: 4.1,
  upload: 8.83,
  link: 3.32,
  engine: 8.56,
  editor: 8.77,
  honesty: 4.11,
  private: 6.0,
  finish: 4.79,
  cta: 8.16,
};

const LEAD = 0.45;
const TAIL = 0.55;
export const BEAT_ORDER = ["hook", "upload", "link", "engine", "editor", "honesty", "private", "finish", "cta"] as const;
export type BeatName = (typeof BEAT_ORDER)[number];

export const BEATS = {} as Record<BeatName, { start: number; vo: number; voLen: number; len: number; end: number }>;
let t = 0.3;
for (const name of BEAT_ORDER) {
  const len = LEAD + VO_SECONDS[name] + TAIL;
  BEATS[name] = {
    start: Math.round(t * FPS),
    vo: Math.round((t + LEAD) * FPS),
    voLen: Math.round(VO_SECONDS[name] * FPS),
    len: Math.round(len * FPS),
    end: Math.round((t + len) * FPS),
  };
  t += len;
}
export const TOTAL = Math.round((t + 0.5) * FPS);
