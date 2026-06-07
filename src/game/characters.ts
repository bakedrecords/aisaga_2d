import type { BulletStyle } from "./Bullet";
import type { SpriteConfig } from "./sprites";

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
  | { kind: "summon" } // summon a demon plus forward lasers (boss-buster)
  | { kind: "dash"; damage: number } // invincible forward charge
  | { kind: "hammer"; damage: number }; // ground slam: big damage to grounded foes

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
  sprite?: SpriteConfig; // pixel-art sheet; falls back to a coloured box if absent
  bombPoseSprites?: string[]; // standalone poses shown across the bomb wind-up
}

export const CHARACTERS: Record<CharacterId, Character> = {
  A: {
    id: "A",
    name: "Matenrou",
    attribute: "炎",
    bodyColor: "#4ade80",
    accent: "#fb923c",
    normal: {
      name: "GUN", fireDelay: 0.16, pellets: 1, spread: 0, speed: 680,
      damage: 1, radius: 4, color: "#fde047", range: 440, ammo: 0, style: "bullet",
    },
    special: {
      name: "FIRE", fireDelay: 0.25, pellets: 6, spread: 0.85, speed: 600,
      damage: 2, radius: 7, color: "#fb923c", range: 230, ammo: 6, style: "flame",
    },
    bomb: { kind: "blast" },
    // Sliced from the uploaded sheet into src/game/assets/charA_anim.png:
    // 18 frames of 196×139 (idle ×4, run ×6, pistol ×5, fire-magic ×3).
    sprite: {
      frameW: 196, frameH: 139, fps: 8,
      anims: {
        idle: [3], // the idle row is a 4-way turn-around; pin to the right-facing pose
        run: [4, 5, 6, 7, 8, 9],
        jump: [9], // a mid-stride run frame reads as a leap
        shoot: [10, 11, 12, 13, 14],
        magic: [15, 16, 17],
        bomb: [15, 16, 17], // fire-magic pose during the bomb charge
      },
    },
  },
  B: {
    id: "B",
    name: "Eita",
    attribute: "闇",
    bodyColor: "#8b5cf6",
    accent: "#a78bfa",
    normal: {
      name: "DARK", fireDelay: 0.24, pellets: 1, spread: 0, speed: 620,
      damage: 1, radius: 5, color: "#0b1020", range: 460, ammo: 0, style: "dark",
    },
    special: {
      name: "LASER", fireDelay: 0.5, pellets: 1, spread: 0, speed: 1150,
      damage: 3, radius: 6, color: "#0b1020", range: 760, ammo: 3, pierce: true, style: "laser",
    },
    // Summon a demon: a screen-wide dark blast with the summoned-monster art.
    bomb: { kind: "summon" },
    // Sliced from charB.png: idle ×4, run ×6, 闇の瘴気 ×4, 闇の炎 ×3.
    sprite: {
      frameW: 200, frameH: 130, fps: 8,
      anims: {
        idle: [3],
        run: [4, 5, 6, 7, 8, 9],
        jump: [9],
        shoot: [10, 11, 12, 13],
        magic: [14, 15, 16],
        bomb: [14, 15, 16], // dark-flame cast pose during the bomb charge
      },
    },
  },
  C: {
    id: "C",
    name: "Ayase",
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
    // Sliced from charC.png: idle ×4, run ×6, 光弾 ×4, 羽ばたき ×4 (flight=jump).
    sprite: {
      frameW: 300, frameH: 116, fps: 8,
      anims: {
        idle: [3],
        run: [4, 5, 6, 7, 8, 9],
        jump: [14, 15, 16, 17], // wing-flap, fitting her double jump
        shoot: [10, 11, 12, 13],
        bomb: [10, 11, 12, 13], // light cast pose during the heal charge
      },
    },
  },
  D: {
    id: "D",
    name: "Tsukahara",
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
    // Sliced from charD.png: idle / run / pistol(shoot) / m.gun(magic) / timestop(bomb).
    sprite: {
      frameW: 186, frameH: 107, fps: 8,
      anims: {
        idle: [3],
        run: [4, 5, 6, 7, 8],
        jump: [8],
        shoot: [9, 10, 11, 12],
        magic: [13, 14, 15, 16],
        bomb: [17, 18], // time-stop cast pose (frame 19 is the clock effect)
      },
    },
  },
  E: {
    id: "E",
    name: "Sae",
    attribute: "物理",
    bodyColor: "#cbd5e1",
    accent: "#94a3b8",
    // Close-range katana: a 90° arc (aimable up) that one-shots weak enemies.
    normal: {
      name: "KATANA", fireDelay: 0.3, pellets: 0, spread: 0, speed: 0,
      damage: 3, radius: 0, color: "#e2e8f0", range: 106, ammo: 0,
      melee: { arc: Math.PI / 2, range: 106 },
    },
    // Shuriken: a strong ranged shot (double A's normal), limited ammo.
    special: {
      name: "SHURIKEN", fireDelay: 0.16, pellets: 1, spread: 0, speed: 680,
      damage: 2, radius: 4, color: "#e2e8f0", range: 440, ammo: 12, style: "shuriken",
    },
    bomb: { kind: "hammer", damage: 14 },
    // Sliced from charE.png: idle ×4, run ×6, 日本刀 ×4, 手裏剣 ×3.
    sprite: {
      frameW: 308, frameH: 122, fps: 8,
      anims: {
        idle: [3],
        run: [4, 5, 6, 7, 8, 9],
        jump: [9],
        shoot: [10, 11, 12, 13], // katana swing
        magic: [14, 15, 16], // shuriken throw
      },
    },
    // Wind-up: raise the hammer (first half) then swing it down (second half).
    bombPoseSprites: ["hammerPoseE", "hammerSlamE"],
  },
};

export const CHARACTER_ORDER: CharacterId[] = ["A", "B", "C", "D", "E"];
