/** Weapon definitions. The player always has the pistol; others come from pickups. */
export type WeaponId = "pistol" | "machinegun" | "shotgun" | "rocket";

export interface Weapon {
  id: WeaponId;
  name: string;
  fireDelay: number; // seconds between shots
  pellets: number; // bullets per shot (spread)
  spread: number; // total angular spread in radians
  speed: number; // px/s
  damage: number;
  explosive: boolean;
  radius: number;
  color: string;
  range: number; // max travel distance (px) before the bullet despawns
  ammo: number; // starting ammo on pickup; 0 means infinite (pistol)
}

export const WEAPONS: Record<WeaponId, Weapon> = {
  pistol: {
    id: "pistol", name: "PISTOL", fireDelay: 0.16, pellets: 1, spread: 0,
    speed: 680, damage: 1, explosive: false, radius: 4, color: "#fde047", range: 440, ammo: 0,
  },
  machinegun: {
    id: "machinegun", name: "M.GUN", fireDelay: 0.07, pellets: 1, spread: 0.07,
    speed: 760, damage: 1, explosive: false, radius: 3, color: "#fef08a", range: 560, ammo: 220,
  },
  shotgun: {
    id: "shotgun", name: "SHOTGUN", fireDelay: 0.5, pellets: 6, spread: 0.5,
    speed: 640, damage: 1, explosive: false, radius: 4, color: "#fdba74", range: 280, ammo: 30,
  },
  rocket: {
    id: "rocket", name: "ROCKET", fireDelay: 0.7, pellets: 1, spread: 0,
    speed: 520, damage: 5, explosive: true, radius: 7, color: "#fb7185", range: 640, ammo: 12,
  },
};

export const PICKUP_WEAPONS: WeaponId[] = ["machinegun", "shotgun", "rocket"];
