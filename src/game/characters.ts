import type { BulletStyle } from "./Bullet";

export type CharacterId = "A" | "B";

/** Stats for a single gun weapon (the main attack or a pickup special). */
export interface WeaponSpec {
  name: string;
  fireDelay: number;
  pellets: number;
  spread: number; // radians
  speed: number;
  damage: number;
  radius: number;
  color: string;
  range: number;
  ammo: number; // 0 = infinite (the main attack)
  pierce?: boolean;
  style?: BulletStyle;
}

/** The bomb ability differs per character. */
export type Bomb =
  | { kind: "blast" } // strong blast centered on the player
  | { kind: "shotgun"; shot: WeaponSpec }; // long-range forward shots

export interface Character {
  id: CharacterId;
  name: string;
  attribute: string;
  bodyColor: string;
  accent: string;
  normal: WeaponSpec; // main attack (button J), infinite
  special: WeaponSpec; // pickup weapon (W box), limited ammo
  bomb: Bomb; // button K
}

export const CHARACTERS: Record<CharacterId, Character> = {
  A: {
    id: "A",
    name: "A",
    attribute: "炎",
    bodyColor: "#4ade80",
    accent: "#fb923c",
    normal: {
      name: "GUN", fireDelay: 0.16, pellets: 1, spread: 0, speed: 680,
      damage: 1, radius: 4, color: "#fde047", range: 440, ammo: 0,
    },
    special: {
      name: "FIRE", fireDelay: 0.25, pellets: 6, spread: 0.85, speed: 600,
      damage: 2, radius: 7, color: "#fb923c", range: 230, ammo: 6, style: "flame",
    },
    bomb: { kind: "blast" },
  },
  B: {
    id: "B",
    name: "B",
    attribute: "闇",
    bodyColor: "#8b5cf6",
    accent: "#a78bfa",
    normal: {
      name: "DARK", fireDelay: 0.24, pellets: 1, spread: 0, speed: 620,
      damage: 1, radius: 5, color: "#0b1020", range: 460, ammo: 0, style: "dark",
    },
    special: {
      name: "LASER", fireDelay: 0.5, pellets: 1, spread: 0, speed: 1150,
      damage: 2, radius: 6, color: "#0b1020", range: 760, ammo: 8, pierce: true, style: "laser",
    },
    bomb: {
      kind: "shotgun",
      shot: {
        name: "DARK SHOT", fireDelay: 0, pellets: 3, spread: 0.16, speed: 780,
        damage: 4, radius: 6, color: "#0b1020", range: 820, ammo: 0, style: "dark",
      },
    },
  },
};

export const CHARACTER_ORDER: CharacterId[] = ["A", "B"];
