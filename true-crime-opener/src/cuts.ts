export const FPS = 30;
export const DURATION_IN_FRAMES = 750;

export const RED = "#ff2a1a";
export const INK = "#f4f4f5";
export const PAPER = "#050506";

export type V3 = [number, number, number];

export const SHOTS = [
  { id: "jemand", from: 0, to: 36 },
  { id: "raum", from: 36, to: 72 },
  { id: "luegt", from: 72, to: 120 },
  { id: "mark1", from: 120, to: 220 },
  { id: "mark2", from: 220, to: 320 },
  { id: "mark3", from: 320, to: 420 },
  { id: "netz", from: 420, to: 510 },
  { id: "karte", from: 510, to: 660 },
  { id: "title", from: 660, to: 750 },
] as const;

export type ShotId = (typeof SHOTS)[number]["id"];

type CameraMove = {
  from: V3;
  to: V3;
  look: V3;
  lookTo?: V3;
  fov: number;
  roll?: number;
};

export const CAMERAS: Record<ShotId, CameraMove> = {
  jemand: {
    from: [0.12, 1.62, 2.05],
    to: [0.02, 1.58, 1.72],
    look: [0, 1.55, 0.15],
    fov: 28,
    roll: 0.04,
  },
  raum: {
    from: [-0.35, 1.72, 3.7],
    to: [-0.12, 1.6, 3.3],
    look: [-0.15, 1.22, -0.25],
    fov: 34,
    roll: -0.02,
  },
  luegt: {
    from: [0.24, 1.4, 1.98],
    to: [0.06, 1.5, 1.58],
    look: [0, 1.58, 0.15],
    fov: 26,
    roll: 0.03,
  },
  mark1: {
    from: [0.06, 1.42, 4.45],
    to: [0, 1.36, 3.9],
    look: [0, 1.12, 0.15],
    fov: 32,
  },
  mark2: {
    from: [-0.58, 1.4, 3.62],
    to: [-0.58, 1.34, 3.18],
    look: [-0.58, 1.12, -0.72],
    fov: 32,
  },
  mark3: {
    from: [0.6, 1.42, 3.55],
    to: [0.6, 1.36, 3.12],
    look: [0.6, 1.16, -0.78],
    fov: 32,
  },
  netz: {
    from: [0.12, 1.9, 5.35],
    to: [-0.08, 2.2, 6.15],
    look: [0, 1.02, -0.4],
    lookTo: [0, 0.82, -0.85],
    fov: 40,
  },
  karte: {
    from: [0.95, 0.64, -1.2],
    to: [0.22, 2.5, -0.55],
    look: [0.02, 0.52, -2.4],
    lookTo: [0, 1.7, -3.4],
    fov: 42,
  },
  title: {
    from: [0.18, 1.95, 5.6],
    to: [-0.04, 1.72, 5.05],
    look: [0, 1.05, -0.35],
    fov: 38,
  },
};

export const FIGURES: {
  id: "a" | "b" | "c";
  position: V3;
  yaw: number;
  markAt: number;
}[] = [
  { id: "a", position: [0, 0, 0.15], yaw: 0.04, markAt: 120 },
  { id: "b", position: [-0.58, 0, -0.72], yaw: 0.42, markAt: 220 },
  { id: "c", position: [0.6, 0, -0.78], yaw: -0.48, markAt: 320 },
];

export function shotAt(frame: number): (typeof SHOTS)[number] {
  for (const shot of SHOTS) {
    if (frame >= shot.from && frame < shot.to) {
      return shot;
    }
  }
  return SHOTS[SHOTS.length - 1];
}

export function ramp(frame: number, start: number, length: number): number {
  if (frame <= start) {
    return 0;
  }
  if (frame >= start + length) {
    return 1;
  }
  const t = (frame - start) / length;
  return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpV(a: V3, b: V3, t: number): V3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function smoothstep(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

export function shakeFor(frame: number): { x: number; y: number } {
  const cuts = [0, 36, 72, 120, 220, 320, 420, 510, 660];
  for (let index = 0; index < cuts.length; index++) {
    const cut = cuts[index];
    const age = frame - cut;
    if (age >= 0 && age < 4) {
      const kick = (4 - age) * 3.2;
      const sign = index % 2 === 0 ? 1 : -1;
      return { x: sign * kick, y: (age % 2 === 0 ? -1 : 1) * kick * 0.35 };
    }
  }
  return { x: 0, y: 0 };
}
