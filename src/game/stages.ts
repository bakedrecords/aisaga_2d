import type { WeaponId } from "./weapons";

export type EnemyKind = "walker" | "shooter" | "flyer" | "brute";

export interface StageTheme {
  sky: string;
  far: string; // distant parallax layer
  hill: string; // near parallax layer
  ground: string;
  edge: string;
}

export interface PlatformDef {
  x: number;
  aboveGround: number; // height of the platform top above the ground line
  w: number;
}

export type PickupDef =
  | { kind: "weapon"; x: number; weapon: WeaponId }
  | { kind: "health"; x: number }
  | { kind: "score"; x: number; value: number };

/** A ground spike strip that damages the player on contact. */
export interface HazardDef {
  x: number;
  w: number;
}

export interface StageDef {
  name: string;
  width: number;
  theme: StageTheme;
  platforms: PlatformDef[];
  hazards: HazardDef[];
  enemies: { type: EnemyKind; x: number }[];
  pickups: PickupDef[];
  spawnInterval: number;
  spawnTypes: EnemyKind[];
  maxEnemies: number;
  boss?: boolean;
}

export const STAGES: StageDef[] = [
  {
    name: "STAGE 1 — JUNGLE",
    width: 2600,
    theme: {
      sky: "#1e293b", far: "#0a2e22", hill: "#14532d", ground: "#3f3f46", edge: "#52525b",
    },
    platforms: [
      { x: 360, aboveGround: 110, w: 160 },
      { x: 760, aboveGround: 180, w: 160 },
      { x: 1180, aboveGround: 120, w: 200 },
      { x: 1700, aboveGround: 190, w: 180 },
      { x: 2150, aboveGround: 120, w: 200 },
    ],
    hazards: [],
    enemies: [
      { type: "walker", x: 820 },
      { type: "walker", x: 1300 },
      { type: "shooter", x: 1850 },
    ],
    pickups: [
      { kind: "weapon", weapon: "machinegun", x: 520 },
      { kind: "score", value: 300, x: 1250 },
    ],
    spawnInterval: 2.6,
    spawnTypes: ["walker", "walker", "shooter"],
    maxEnemies: 6,
  },
  {
    name: "STAGE 2 — RUINS",
    width: 2900,
    theme: {
      sky: "#1f2937", far: "#241d3a", hill: "#3b2f5e", ground: "#44403c", edge: "#57534e",
    },
    platforms: [
      { x: 300, aboveGround: 130, w: 150 },
      { x: 640, aboveGround: 210, w: 150 },
      { x: 1020, aboveGround: 140, w: 180 },
      { x: 1450, aboveGround: 220, w: 160 },
      { x: 1850, aboveGround: 140, w: 200 },
      { x: 2350, aboveGround: 210, w: 180 },
    ],
    hazards: [{ x: 1150, w: 96 }],
    enemies: [
      { type: "shooter", x: 700 },
      { type: "walker", x: 1100 },
      { type: "flyer", x: 1500 },
      { type: "brute", x: 1750 },
      { type: "shooter", x: 2200 },
    ],
    pickups: [
      { kind: "weapon", weapon: "shotgun", x: 420 },
      { kind: "health", x: 1320 },
      { kind: "weapon", weapon: "machinegun", x: 1950 },
    ],
    spawnInterval: 2.2,
    spawnTypes: ["walker", "shooter", "flyer"],
    maxEnemies: 7,
  },
  {
    name: "STAGE 3 — FORTRESS",
    width: 1700,
    theme: {
      sky: "#1c1917", far: "#2a1320", hill: "#3f1d2e", ground: "#3f3f46", edge: "#52525b",
    },
    platforms: [
      { x: 240, aboveGround: 130, w: 180 },
      { x: 1280, aboveGround: 130, w: 180 },
    ],
    hazards: [],
    enemies: [],
    pickups: [
      { kind: "weapon", weapon: "rocket", x: 320 },
      { kind: "health", x: 880 },
    ],
    spawnInterval: 3.4,
    spawnTypes: ["walker", "flyer"],
    maxEnemies: 4,
    boss: true,
  },
];
