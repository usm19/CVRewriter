import React from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { OldEra } from "./scenes/OldEra";
import { Reveal } from "./scenes/Reveal";
import { DemoUpload } from "./scenes/DemoUpload";
import { DemoTailor } from "./scenes/DemoTailor";
import { BeforeAfter } from "./scenes/BeforeAfter";
import { Honesty } from "./scenes/Honesty";
import { Private } from "./scenes/Private";
import { NewEra } from "./scenes/NewEra";

const T = 18;
export const SCENES = [180, 140, 300, 330, 260, 190, 200, 220];
export const PROMO_DURATION = SCENES.reduce((a, b) => a + b, 0) - T * (SCENES.length - 1);

const parts = [OldEra, Reveal, DemoUpload, DemoTailor, BeforeAfter, Honesty, Private, NewEra];
const names = ["OldEra", "Reveal", "DemoUpload", "DemoTailor", "BeforeAfter", "Honesty", "Private", "NewEra"];

export const Promo: React.FC = () => (
  <TransitionSeries>
    {parts.flatMap((Scene, i) => {
      const seq = (
        <TransitionSeries.Sequence key={names[i]} durationInFrames={SCENES[i]} name={names[i]}>
          <Scene />
        </TransitionSeries.Sequence>
      );
      if (i === parts.length - 1) return [seq];
      return [seq, <TransitionSeries.Transition key={`t${i}`} presentation={fade()} timing={linearTiming({ durationInFrames: T })} />];
    })}
  </TransitionSeries>
);
