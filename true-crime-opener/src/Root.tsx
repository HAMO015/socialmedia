import { Composition } from "remotion";
import { ColdOpen } from "./ColdOpen";
import { DURATION_IN_FRAMES, FPS } from "./cuts";

export function RemotionRoot() {
  return (
    <Composition
      id="ColdOpen"
      component={ColdOpen}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
    />
  );
}
