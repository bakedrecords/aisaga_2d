import type { BulletStyle } from "./Bullet";

export type CharacterId = "A" | "B" | "C" | "D" | "E";

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
  extraUp?: boolean; // also fire one shot straight up (twin attack)
  /** Melee instead of a projectile: a forward arc. */
  melee?: { arc: number; range: number };
}

/** The bomb ability differs per character. */
export type Bomb =
  | { kind: "blast" } // strong blast centered on the player
  | { kind: "shotgun"; shot: WeaponSpec } // long-range forward shots
  | { kind: "heal"; amount: number } // restore HP instead of attacking
  | { kind: "timestop"; duration: number } // freeze enemies and their shots
  | { kind: "dash"; damage: number }; // invincible forward charge

export interface Character {
  id: CharacterId;
  name: string;
  attribute: string;
  bodyColor: string;
  accent: string;
  normal: WeaponSpec; // main attack (button J), infinite
  special: WeaponSpec; // pickup weapon (W box), limited ammo
  bomb: Bomb; // button K
  airJumps?: number; // extra mid-air jumps (e.g. 1 = double jump)
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
    // A forward fan of piercing lasers.
    bomb: {
      kind: "shotgun",
      shot: {
        name: "LASER FAN", fireDelay: 0, pellets: 5, spread: 0.34, speed: 1120,
        damage: 2, radius: 6, color: "#0b1020", range: 780, ammo: 0, pierce: true, style: "laser",
      },
    },
  },
  C: {
    id: "C",
    name: "C",
    attribute: "光",
    bodyColor: "#fcd34d",
    accent: "#fef08a",
    // Normal attack matches B's, but white.
    normal: {
      name: "LIGHT", fireDelay: 0.24, pellets: 1, spread: 0, speed: 620,
      damage: 1, radius: 5, color: "#f8fafc", range: 460, ammo: 0, style: "light",
    },
    // Special fires forward and straight up at the same time.
    special: {
      name: "TWIN", fireDelay: 0.28, pellets: 1, spread: 0, speed: 660,
      damage: 2, radius: 5, color: "#f8fafc", range: 440, ammo: 8, extraUp: true, style: "light",
    },
    bomb: { kind: "heal", amount: 2 },
    airJumps: 1,
  },
  D: {
    id: "D",
    name: "D",
    attribute: "時空",
    bodyColor: "#22d3ee",
    accent: "#67e8f9",
    // Same gun as A.
    normal: {
      name: "GUN", fireDelay: 0.16, pellets: 1, spread: 0, speed: 680,
      damage: 1, radius: 4, color: "#fde047", range: 440, ammo: 0,
    },
    // The machine gun, revived for this character.
    special: {
      name: "M.GUN", fireDelay: 0.07, pellets: 1, spread: 0.08, speed: 780,
      damage: 1, radius: 3, color: "#67e8f9", range: 540, ammo: 40,
    },
    bomb: { kind: "timestop", duration: 3 },
  },
  E: {
    id: "E",
    name: "E",
    attribute: "物理",
    bodyColor: "#cbd5e1",
    accent: "#94a3b8",
    // Close-range katana: a 90° arc (aimable up) that one-shots weak enemies.
    normal: {
      name: "KATANA", fireDelay: 0.3, pellets: 0, spread: 0, speed: 0,
      damage: 3, radius: 0, color: "#e2e8f0", range: 132, ammo: 0,
      melee: { arc: Math.PI / 2, range: 132 },
    },
    // Shuriken: a ranged shot as strong as A's normal attack.
    special: {
      name: "SHURIKEN", fireDelay: 0.16, pellets: 1, spread: 0, speed: 680,
      damage: 1, radius: 4, color: "#e2e8f0", range: 440, ammo: 24,
    },
    bomb: { kind: "dash", damage: 10 },
  },
};

export const CHARACTER_ORDER: CharacterId[] = ["A", "B", "C", "D", "E"];
