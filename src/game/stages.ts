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
  | { kind: "bomb"; x: number }
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
  /** Authored enemy placements. Enemies activate as the player approaches. */
  enemies: { type: EnemyKind; x: number }[];
  pickups: PickupDef[];
  boss?: boolean;
}

export const STAGES: StageDef[] = [
  {
    name: "STAGE 1 — JUNGLE",
    width: 7800,
    theme: {
      sky: "#1e293b", far: "#0a2e22", hill: "#14532d", ground: "#3f3f46", edge: "#52525b",
    },
    platforms: [
      { x: 360, aboveGround: 110, w: 160 },
      { x: 820, aboveGround: 170, w: 160 },
      { x: 1300, aboveGround: 120, w: 200 },
      { x: 1800, aboveGround: 190, w: 180 },
      { x: 2350, aboveGround: 120, w: 200 },
      { x: 2900, aboveGround: 170, w: 170 },
      { x: 3450, aboveGround: 210, w: 160 },
      { x: 4000, aboveGround: 120, w: 200 },
      { x: 4600, aboveGround: 180, w: 180 },
      { x: 5200, aboveGround: 130, w: 200 },
      { x: 5800, aboveGround: 200, w: 170 },
      { x: 6400, aboveGround: 120, w: 200 },
      { x: 7000, aboveGround: 170, w: 180 },
    ],
    hazards: [
      { x: 2500, w: 90 },
      { x: 4850, w: 90 },
    ],
    enemies: [
      { type: "walker", x: 700 },
      { type: "shooter", x: 1150 },
      { type: "walker", x: 1600 },
      { type: "flyer", x: 2000 },
      { type: "walker", x: 2450 },
      { type: "shooter", x: 2950 },
      { type: "walker", x: 3400 },
      { type: "flyer", x: 3850 },
      { type: "walker", x: 4300 },
      { type: "shooter", x: 4750 },
      { type: "walker", x: 5200 },
      { type: "flyer", x: 5650 },
      { type: "walker", x: 6100 },
      { type: "shooter", x: 6550 },
      { type: "walker", x: 7000 },
      { type: "shooter", x: 7350 },
    ],
    pickups: [
      { kind: "weapon", weapon: "flame", x: 520 },
      { kind: "score", value: 300, x: 1250 },
      { kind: "health", x: 2600 },
      { kind: "bomb", x: 3450 },
      { kind: "score", value: 300, x: 3900 },
      { kind: "weapon", weapon: "flame", x: 5100 },
      { kind: "health", x: 6300 },
      { kind: "score", value: 500, x: 7200 },
    ],
  },
  {
    name: "STAGE 2 — RUINS",
    width: 8700,
    theme: {
      sky: "#1f2937", far: "#241d3a", hill: "#3b2f5e", ground: "#44403c", edge: "#57534e",
    },
    platforms: [
      { x: 300, aboveGround: 130, w: 150 },
      { x: 760, aboveGround: 210, w: 150 },
      { x: 1250, aboveGround: 140, w: 180 },
      { x: 1800, aboveGround: 220, w: 160 },
      { x: 2350, aboveGround: 140, w: 200 },
      { x: 2950, aboveGround: 200, w: 170 },
      { x: 3550, aboveGround: 130, w: 200 },
      { x: 4150, aboveGround: 210, w: 160 },
      { x: 4800, aboveGround: 140, w: 200 },
      { x: 5450, aboveGround: 200, w: 170 },
      { x: 6100, aboveGround: 140, w: 200 },
      { x: 6800, aboveGround: 210, w: 160 },
      { x: 7500, aboveGround: 140, w: 200 },
      { x: 8100, aboveGround: 180, w: 180 },
    ],
    hazards: [
      { x: 1150, w: 96 },
      { x: 3400, w: 96 },
      { x: 5900, w: 110 },
      { x: 7600, w: 96 },
    ],
    enemies: [
      { type: "shooter", x: 700 },
      { type: "walker", x: 1100 },
      { type: "flyer", x: 1500 },
      { type: "walker", x: 1900 },
      { type: "shooter", x: 2300 },
      { type: "brute", x: 2700 },
      { type: "walker", x: 3100 },
      { type: "flyer", x: 3500 },
      { type: "shooter", x: 3900 },
      { type: "walker", x: 4300 },
      { type: "flyer", x: 4700 },
      { type: "shooter", x: 5100 },
      { type: "brute", x: 5600 },
      { type: "walker", x: 6000 },
      { type: "flyer", x: 6400 },
      { type: "shooter", x: 6800 },
      { type: "walker", x: 7300 },
      { type: "shooter", x: 7800 },
      { type: "walker", x: 8200 },
    ],
    pickups: [
      { kind: "weapon", weapon: "flame", x: 420 },
      { kind: "health", x: 1300 },
      { kind: "bomb", x: 2500 },
      { kind: "score", value: 300, x: 3600 },
      { kind: "weapon", weapon: "flame", x: 5000 },
      { kind: "health", x: 6200 },
      { kind: "bomb", x: 7400 },
      { kind: "score", value: 500, x: 8200 },
    ],
  },
  {
    name: "STAGE 3 — FORTRESS",
    width: 5100,
    theme: {
      sky: "#1c1917", far: "#2a1320", hill: "#3f1d2e", ground: "#3f3f46", edge: "#52525b",
    },
    platforms: [
      { x: 300, aboveGround: 130, w: 180 },
      { x: 900, aboveGround: 180, w: 160 },
      { x: 1500, aboveGround: 130, w: 180 },
      { x: 2200, aboveGround: 190, w: 160 },
      { x: 2900, aboveGround: 130, w: 180 },
      { x: 3600, aboveGround: 190, w: 160 },
      { x: 4200, aboveGround: 130, w: 180 },
    ],
    hazards: [
      { x: 1800, w: 96 },
      { x: 3300, w: 96 },
    ],
    enemies: [
      { type: "walker", x: 700 },
      { type: "flyer", x: 1100 },
      { type: "shooter", x: 1500 },
      { type: "walker", x: 1900 },
      { type: "flyer", x: 2300 },
      { type: "shooter", x: 2700 },
      { type: "walker", x: 3100 },
      { type: "flyer", x: 3500 },
      { type: "shooter", x: 3900 },
      { type: "walker", x: 4200 },
    ],
    pickups: [
      { kind: "bomb", x: 320 },
      { kind: "health", x: 1500 },
      { kind: "weapon", weapon: "flame", x: 3000 },
      { kind: "health", x: 4200 },
    ],
    boss: true,
  },
];
