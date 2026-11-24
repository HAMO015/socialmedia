import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import { useCurrentFrame } from "remotion";
import {
  BackSide,
  CanvasTexture,
  CatmullRomCurve3,
  DoubleSide,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
  type PerspectiveCamera,
} from "three";
import {
  CAMERAS,
  FIGURES,
  PAPER,
  ramp,
  lerpV,
  RED,
  shotAt,
  smoothstep,
  type V3,
} from "./cuts";

const NECK_Y = 1.92;

function surface(kind: "charcoal" | "marker") {
  if (kind === "marker") {
    return (
      <meshBasicMaterial
        color={RED}
        side={BackSide}
        toneMapped={false}
        fog={false}
      />
    );
  }
  return (
    <meshStandardMaterial color="#141418" roughness={0.9} metalness={0.05} />
  );
}

function Mannequin({ kind }: { kind: "charcoal" | "marker" }) {
  return (
    <group>
      <mesh position={[-0.11, 0.43, 0]}>
        <cylinderGeometry args={[0.075, 0.062, 0.86, 12]} />
        {surface(kind)}
      </mesh>
      <mesh position={[0.11, 0.43, 0]}>
        <cylinderGeometry args={[0.075, 0.062, 0.86, 12]} />
        {surface(kind)}
      </mesh>
      <mesh position={[0, 1.16, 0]}>
        <boxGeometry args={[0.46, 0.64, 0.24]} />
        {surface(kind)}
      </mesh>
      <mesh position={[0, 1.42, 0]}>
        <boxGeometry args={[0.72, 0.1, 0.2]} />
        {surface(kind)}
      </mesh>
      <mesh position={[-0.4, 1.08, 0]} rotation={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.055, 0.048, 0.56, 10]} />
        {surface(kind)}
      </mesh>
      <mesh position={[0.4, 1.08, 0]} rotation={[0, 0, -0.08]}>
        <cylinderGeometry args={[0.055, 0.048, 0.56, 10]} />
        {surface(kind)}
      </mesh>
      <mesh position={[0, 1.56, 0]}>
        <cylinderGeometry args={[0.055, 0.06, 0.12, 10]} />
        {surface(kind)}
      </mesh>
      <mesh position={[0, 1.74, 0]}>
        <sphereGeometry args={[0.155, 20, 16]} />
        {surface(kind)}
      </mesh>
    </group>
  );
}

function Corner({
  x,
  y,
  hx,
  hy,
}: {
  x: number;
  y: number;
  hx: number;
  hy: number;
}) {
  const arm = 0.2;
  const thick = 0.014;
  return (
    <group position={[x, y, 0]}>
      <mesh position={[hx * arm * 0.5, 0, 0]}>
        <boxGeometry args={[arm, thick, thick]} />
        <meshBasicMaterial color={RED} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, hy * arm * 0.5, 0]}>
        <boxGeometry args={[thick, arm, thick]} />
        <meshBasicMaterial color={RED} toneMapped={false} fog={false} />
      </mesh>
    </group>
  );
}

function MarkerRig({ amount }: { amount: number }) {
  if (amount < 0.02) {
    return null;
  }

  const w = 0.7;
  const h = 1.72;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[0.34, 0.4, 40]} />
        <meshBasicMaterial
          color={RED}
          toneMapped={false}
          fog={false}
          transparent
          opacity={amount}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 2.62, 0]}>
        <boxGeometry args={[0.01, 1.05, 0.01]} />
        <meshBasicMaterial
          color={RED}
          toneMapped={false}
          fog={false}
          transparent
          opacity={0.8 * amount}
        />
      </mesh>
      <group position={[0, 1.02, 0]} scale={1.08 - 0.08 * amount}>
        <Corner x={-w / 2} y={h / 2} hx={1} hy={-1} />
        <Corner x={w / 2} y={h / 2} hx={-1} hy={-1} />
        <Corner x={-w / 2} y={-h / 2} hx={1} hy={1} />
        <Corner x={w / 2} y={-h / 2} hx={-1} hy={1} />
      </group>
    </group>
  );
}

function Figure({
  position,
  yaw,
  amount,
}: {
  position: V3;
  yaw: number;
  amount: number;
}) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <circleGeometry args={[0.38, 28]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.55} />
      </mesh>
      {amount > 0.02 ? (
        <group position={[0, 0.95, 0]} scale={1 + 0.05 * amount}>
          <group position={[0, -0.95, 0]}>
            <Mannequin kind="marker" />
          </group>
        </group>
      ) : null}
      <Mannequin kind="charcoal" />
      <MarkerRig amount={amount} />
    </group>
  );
}

function Thread({
  ax,
  ay,
  az,
  bx,
  by,
  bz,
  progress,
  radius,
  sag,
}: {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  progress: number;
  radius: number;
  sag: number;
}) {
  const q = Math.round(Math.min(1, Math.max(0, progress)) * 28) / 28;
  const geometry = useMemo(() => {
    if (q < 0.04) {
      return null;
    }
    const start = new Vector3(ax, ay, az);
    const end = new Vector3(bx, by, bz);
    const mid = new Vector3(
      (ax + bx) / 2,
      Math.min(ay, by) - sag,
      (az + bz) / 2,
    );
    const curve = new CatmullRomCurve3([
      start,
      curvePoint(start, mid, end, q * 0.45),
      curvePoint(start, mid, end, q),
    ]);
    return new TubeGeometry(curve, 18, radius, 5, false);
  }, [ax, ay, az, bx, by, bz, q, radius, sag]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  if (!geometry) {
    return null;
  }

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color={RED} toneMapped={false} fog={false} />
    </mesh>
  );
}

function curvePoint(a: Vector3, b: Vector3, c: Vector3, t: number): Vector3 {
  const ab = a.clone().lerp(b, t);
  const bc = b.clone().lerp(c, t);
  return ab.lerp(bc, t);
}

function CameraRig() {
  const camera = useThree((state) => state.camera);
  const frame = useCurrentFrame();

  useLayoutEffect(() => {
    const shot = shotAt(frame);
    const span = Math.max(1, shot.to - shot.from);
    const t = smoothstep((frame - shot.from) / span);
    const move = CAMERAS[shot.id];
    const position = lerpV(move.from, move.to, t);
    const look = lerpV(move.look, move.lookTo ?? move.look, t);
    camera.position.set(position[0], position[1], position[2]);
    camera.lookAt(look[0], look[1], look[2]);
    const perspective = camera as PerspectiveCamera;
    perspective.fov = move.fov;
    perspective.near = 0.06;
    perspective.far = 40;
    perspective.updateProjectionMatrix();
    if (move.roll) {
      camera.rotateZ(move.roll);
    }
  }, [camera, frame]);

  return null;
}

const BLOCKS: {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  hot: boolean;
}[] = [
  { x: -0.5, z: -0.28, w: 0.22, d: 0.22, h: 0.32, hot: false },
  { x: -0.22, z: -0.3, w: 0.18, d: 0.26, h: 0.55, hot: true },
  { x: 0.02, z: -0.12, w: 0.2, d: 0.18, h: 0.24, hot: false },
  { x: 0.28, z: -0.26, w: 0.16, d: 0.22, h: 0.4, hot: false },
  { x: 0.48, z: 0.02, w: 0.14, d: 0.16, h: 0.2, hot: false },
  { x: -0.46, z: 0.16, w: 0.2, d: 0.16, h: 0.3, hot: false },
  { x: -0.16, z: 0.2, w: 0.15, d: 0.15, h: 0.48, hot: true },
  { x: 0.14, z: 0.22, w: 0.22, d: 0.16, h: 0.28, hot: false },
  { x: 0.4, z: 0.24, w: 0.12, d: 0.18, h: 0.18, hot: false },
  { x: 0.02, z: 0.02, w: 0.12, d: 0.12, h: 0.62, hot: true },
  { x: 0.26, z: 0, w: 0.1, d: 0.16, h: 0.36, hot: false },
  { x: -0.34, z: -0.05, w: 0.14, d: 0.14, h: 0.22, hot: false },
];

function makePaper(seed: number, accent: boolean): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 340;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Paper texture failed");
  }
  context.fillStyle = "#2c2c31";
  context.fillRect(0, 0, 256, 340);
  let state = seed;
  const next = () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
  for (let row = 0; row < 10; row++) {
    context.fillStyle = row === 5 && accent ? RED : "#141418";
    context.fillRect(22, 26 + row * 30, 70 + next() * 150, 12);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

const PAPERS: {
  x: number;
  y: number;
  w: number;
  h: number;
  seed: number;
  accent: boolean;
  rot: number;
}[] = [
  { x: -0.62, y: 0.58, w: 0.62, h: 0.78, seed: 2, accent: false, rot: -0.04 },
  { x: 0.06, y: 0.64, w: 0.7, h: 0.86, seed: 5, accent: true, rot: 0.02 },
  { x: 0.7, y: 0.5, w: 0.56, h: 0.74, seed: 9, accent: false, rot: 0.05 },
  { x: -0.55, y: -0.48, w: 0.66, h: 0.72, seed: 12, accent: true, rot: 0.03 },
  { x: 0.14, y: -0.52, w: 0.72, h: 0.8, seed: 17, accent: false, rot: -0.03 },
  { x: 0.7, y: -0.4, w: 0.5, h: 0.66, seed: 21, accent: false, rot: 0.04 },
];

function Pinboard({ reveal }: { reveal: number }) {
  const textures = useMemo(
    () => PAPERS.map((paper) => makePaper(paper.seed, paper.accent)),
    [],
  );

  return (
    <group position={[0, 1.68, -3.42]}>
      <mesh>
        <boxGeometry args={[2.4, 2.55, 0.06]} />
        <meshStandardMaterial color="#121216" roughness={0.92} />
      </mesh>
      {PAPERS.map((paper, index) => (
        <mesh
          key={paper.seed}
          position={[paper.x, paper.y, 0.045]}
          rotation={[0, 0, paper.rot]}
        >
          <planeGeometry args={[paper.w, paper.h]} />
          <meshStandardMaterial map={textures[index]} roughness={0.85} />
        </mesh>
      ))}
      {PAPERS.map((paper) => (
        <mesh key={`pin-${paper.seed}`} position={[paper.x, paper.y + paper.h * 0.38, 0.06]}>
          <sphereGeometry args={[0.022, 10, 10]} />
          <meshBasicMaterial
            color={paper.accent ? RED : "#8d8d93"}
            toneMapped={false}
          />
        </mesh>
      ))}
      <Thread
        ax={-0.62}
        ay={0.58}
        az={0.07}
        bx={0.06}
        by={0.64}
        bz={0.07}
        progress={reveal}
        radius={0.008}
        sag={0.12}
      />
      <Thread
        ax={0.06}
        ay={0.64}
        az={0.07}
        bx={0.7}
        by={0.5}
        bz={0.07}
        progress={reveal}
        radius={0.008}
        sag={0.1}
      />
      <Thread
        ax={-0.55}
        ay={-0.48}
        az={0.07}
        bx={0.14}
        by={-0.52}
        bz={0.07}
        progress={reveal}
        radius={0.008}
        sag={0.1}
      />
    </group>
  );
}

function City({ reveal }: { reveal: number }) {
  const hots = BLOCKS.filter((block) => block.hot);
  const links =
    hots.length >= 3
      ? [
          [hots[0], hots[1]],
          [hots[1], hots[2]],
          [hots[0], hots[2]],
        ]
      : [];

  return (
    <group position={[0, 0.46, -2.15]}>
      <mesh position={[0, -0.22, 0]}>
        <boxGeometry args={[1.78, 0.44, 1.22]} />
        <meshStandardMaterial color="#101014" roughness={0.88} metalness={0.08} />
      </mesh>
      <mesh position={[0, -0.008, 0]}>
        <boxGeometry args={[1.82, 0.02, 1.26]} />
        <meshStandardMaterial color="#24242b" roughness={0.72} />
      </mesh>
      {BLOCKS.map((block) => (
        <mesh
          key={`${block.x}-${block.z}`}
          position={[block.x, block.h / 2, block.z]}
        >
          <boxGeometry args={[block.w, block.h, block.d]} />
          {block.hot ? (
            <meshBasicMaterial
              color={RED}
              toneMapped={false}
              fog={false}
              transparent
              opacity={0.2 + 0.8 * reveal}
            />
          ) : (
            <meshStandardMaterial color="#1b1b21" roughness={0.92} />
          )}
        </mesh>
      ))}
      {links.map(([from, to]) => (
        <Thread
          key={`${from.x}-${to.x}`}
          ax={from.x}
          ay={from.h}
          az={from.z}
          bx={to.x}
          by={to.h}
          bz={to.z}
          progress={reveal}
          radius={0.012}
          sag={0.08}
        />
      ))}
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.42} color="#c8c8ce" />
      <directionalLight position={[1.6, 4.4, 3.4]} intensity={2.6} color="#e8e8ec" />
      <directionalLight position={[-2.4, 3.4, -2.2]} intensity={3.4} color="#f2f2f5" />
      <pointLight
        position={[0, 2.9, 0.35]}
        intensity={22}
        distance={10}
        decay={2}
        color="#d5d5da"
      />
    </>
  );
}

export function InvestigationRoom() {
  const frame = useCurrentFrame();
  const reveal = ramp(frame, 400, 55);
  const [figureA, figureB, figureC] = FIGURES;

  return (
    <>
      <color attach="background" args={[PAPER]} />
      <fog attach="fog" args={[PAPER, 4.8, 14]} />
      <CameraRig />
      <Lights />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.6]}>
        <planeGeometry args={[8, 11]} />
        <meshStandardMaterial color="#0c0c10" roughness={0.96} metalness={0.04} />
      </mesh>
      <gridHelper args={[8, 16, "#2c2c32", "#151519"]} position={[0, 0.005, 0.6]} />
      <mesh position={[0, 1.62, -3.62]}>
        <boxGeometry args={[5.3, 3.24, 0.1]} />
        <meshStandardMaterial color="#0a0a0d" roughness={1} />
      </mesh>
      <mesh position={[-2.6, 1.62, 1.05]}>
        <boxGeometry args={[0.1, 3.24, 9.5]} />
        <meshStandardMaterial color="#0b0b0e" roughness={1} />
      </mesh>
      <mesh position={[2.6, 1.62, 1.05]}>
        <boxGeometry args={[0.1, 3.24, 9.5]} />
        <meshStandardMaterial color="#0b0b0e" roughness={1} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.24, 1.05]}>
        <planeGeometry args={[5.3, 9.5]} />
        <meshStandardMaterial color="#070709" roughness={1} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 3.12, 0.4]}>
        <cylinderGeometry args={[0.005, 0.005, 0.24, 6]} />
        <meshBasicMaterial color="#3a3a40" />
      </mesh>
      <mesh position={[0, 2.98, 0.4]}>
        <sphereGeometry args={[0.05, 14, 12]} />
        <meshBasicMaterial color="#dedee3" toneMapped={false} />
      </mesh>
      <Pinboard reveal={reveal} />
      <City reveal={reveal} />
      <Figure
        position={figureA.position}
        yaw={figureA.yaw}
        amount={ramp(frame, figureA.markAt, 14)}
      />
      <Figure
        position={figureB.position}
        yaw={figureB.yaw}
        amount={ramp(frame, figureB.markAt, 14)}
      />
      <Figure
        position={figureC.position}
        yaw={figureC.yaw}
        amount={ramp(frame, figureC.markAt, 14)}
      />
      <Thread
        ax={figureA.position[0]}
        ay={NECK_Y}
        az={figureA.position[2]}
        bx={figureB.position[0]}
        by={NECK_Y}
        bz={figureB.position[2]}
        progress={ramp(frame, 236, 40)}
        radius={0.018}
        sag={0.26}
      />
      <Thread
        ax={figureA.position[0]}
        ay={NECK_Y + 0.06}
        az={figureA.position[2]}
        bx={figureC.position[0]}
        by={NECK_Y + 0.06}
        bz={figureC.position[2]}
        progress={ramp(frame, 336, 40)}
        radius={0.018}
        sag={0.3}
      />
      <Thread
        ax={figureB.position[0]}
        ay={NECK_Y + 0.12}
        az={figureB.position[2]}
        bx={figureC.position[0]}
        by={NECK_Y + 0.12}
        bz={figureC.position[2]}
        progress={ramp(frame, 364, 42)}
        radius={0.018}
        sag={0.2}
      />
    </>
  );
}
