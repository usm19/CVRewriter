import React from "react";
import { Composition } from "remotion";
import { Film, FILM_DURATION } from "./Film";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="PromoWide" component={Film} durationInFrames={FILM_DURATION} fps={30} width={1920} height={1080} />
    <Composition id="PromoTall" component={Film} durationInFrames={FILM_DURATION} fps={30} width={1080} height={1920} />
  </>
);
