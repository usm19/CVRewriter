import React from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { useVideoConfig } from "remotion";
import { OldEra } from "./scenes/OldEra";
import { Reveal } from "./scenes/Reveal";
import { Paste } from "./scenes/Paste";
import { Mirror } from "./scenes/Mirror";
import { Layout } from "./scenes/Layout";
import { Honesty } from "./scenes/Honesty";
import { Private } from "./scenes/Private";
import { NewEra } from "./scenes/NewEra";

const T = 18;
export const SCENES = [170, 150, 175, 240, 175, 165, 175, 200];
export const PROMO_DURATION = SCENES.reduce((a, b) => a + b, 0) - T * (SCENES.length - 1);

export const Promo: React.FC = () => {
  useVideoConfig();
  const t = () => (
    <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
  );
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={SCENES[0]} name="OldEra"><OldEra /></TransitionSeries.Sequence>
      {t()}
      <TransitionSeries.Sequence durationInFrames={SCENES[1]} name="Reveal"><Reveal /></TransitionSeries.Sequence>
      {t()}
      <TransitionSeries.Sequence durationInFrames={SCENES[2]} name="Paste"><Paste /></TransitionSeries.Sequence>
      {t()}
      <TransitionSeries.Sequence durationInFrames={SCENES[3]} name="Mirror"><Mirror /></TransitionSeries.Sequence>
      {t()}
      <TransitionSeries.Sequence durationInFrames={SCENES[4]} name="Layout"><Layout /></TransitionSeries.Sequence>
      {t()}
      <TransitionSeries.Sequence durationInFrames={SCENES[5]} name="Honesty"><Honesty /></TransitionSeries.Sequence>
      {t()}
      <TransitionSeries.Sequence durationInFrames={SCENES[6]} name="Private"><Private /></TransitionSeries.Sequence>
      {t()}
      <TransitionSeries.Sequence durationInFrames={SCENES[7]} name="NewEra"><NewEra /></TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
