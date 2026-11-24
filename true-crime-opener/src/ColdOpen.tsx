import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { PAPER, shakeFor } from "./cuts";
import { Overlay } from "./Overlay";
import { InvestigationRoom } from "./Scene";

export function ColdOpen() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const shake = shakeFor(frame);

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${shake.x}px, ${shake.y}px)`,
        }}
      >
        <ThreeCanvas
          width={width}
          height={height}
          dpr={1}
          gl={{ antialias: true, alpha: false }}
          camera={{ fov: 32, near: 0.06, far: 40, position: [0, 1.5, 5] }}
        >
          <InvestigationRoom />
        </ThreeCanvas>
        <Overlay />
        <Audio src={staticFile("hits.wav")} volume={0.92} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
