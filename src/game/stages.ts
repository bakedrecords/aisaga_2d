import type { WeaponId } from "./weapons";

export type EnemyKind = "walker" | "shooter" | "flyer";

export interface StageTheme {
  sky: string;
  hill: string;
  ground: string;
  edge: string;
}

export interface PlatformDef {
  x: number;
  aboveGround: number; // height of the platform top above the ground line
  w: number;
}

export interface StageDef {
  name: string;
  width: number;
  theme: StageTheme;
  platforms: PlatformDef[];
  enemies: { type: EnemyKind; x: number }[];
  pickups: { weapon: WeaponId; x: number }[];
  spawnInterval: number;
  spawnTypes: EnemyKind[];
  maxEnemies: number;
  boss?: boolean;
}

export const STAGES: StageDef[] = [
  {
    name: "STAGE 1 — JUNGLE",
    width: 2600,
    theme: { sky: "#1e293b", hill: "#14532d", ground: "#3f3f46", edge: "#52525b" },
    platforms: [
      { x: 360, aboveGround: 110, w: 160 },
      { x: 760, aboveGround: 180, w: 160 },
      { x: 1180, aboveGround: 120, w: 200 },
      { x: 1700, aboveGround: 190, w: 180 },
      { x: 2150, aboveGround: 120, w: 200 },
    ],
    enemies: [
      { type: "walker", x: 820 },
      { type: "walker", x: 1300 },
      { type: "shooter", x: 1850 },
    ],
    pickups: [{ weapon: "machinegun", x: 520 }],
    spawnInterval: 2.6,
    spawnTypes: ["walker", "walker", "shooter"],
    maxEnemies: 6,
  },
  {
    name: "STAGE 2 — RUINS",
    width: 2900,
    theme: { sky: "#1f2937", hill: "#3b2f5e", ground: "#44403c", edge: "#57534e" },
    platforms: [
      { x: 300, aboveGround: 130, w: 150 },
      { x: 640, aboveGround: 210, w: 150 },
      { x: 1020, aboveGround: 140, w: 180 },
      { x: 1450, aboveGround: 220, w: 160 },
      { x: 1850, aboveGround: 140, w: 200 },
      { x: 2350, aboveGround: 210, w: 180 },
    ],
    enemies: [
      { type: "shooter", x: 700 },
      { type: "walker", x: 1100 },
      { type: "flyer", x: 1500 },
      { type: "shooter", x: 2000 },
    ],
    pickups: [
      { weapon: "shotgun", x: 420 },
      { weapon: "machinegun", x: 1600 },
    ],
    spawnInterval: 2.2,
    spawnTypes: ["walker", "shooter", "flyer"],
    maxEnemies: 7,
  },
  {
    name: "STAGE 3 — FORTRESS",
    width: 1700,
    theme: { sky: "#1c1917", hill: "#3f1d2e", ground: "#3f3f46", edge: "#52525b" },
    platforms: [
      { x: 240, aboveGround: 130, w: 180 },
      { x: 1280, aboveGround: 130, w: 180 },
    ],
    enemies: [],
    pickups: [{ weapon: "rocket", x: 320 }],
    spawnInterval: 3.4,
    spawnTypes: ["walker", "flyer"],
    maxEnemies: 4,
    boss: true,
  },
];
