/** Gun weapons fired with the main attack button. The pistol is always
 *  available; the flamethrower comes from a pickup. (The bomb is a separate
 *  ability, not a gun — see Player.) */
export type WeaponId = "pistol" | "flame";

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
  // Fire: a short burst of fireballs in a wide forward arc (only a few shots).
  flame: {
    id: "flame", name: "FIRE", fireDelay: 0.25, pellets: 6, spread: 0.85,
    speed: 600, damage: 2, explosive: false, radius: 7, color: "#fb923c", range: 230, ammo: 6,
  },
};

/** Gun weapons that can be picked up / dropped (the pistol is innate). */
export const PICKUP_WEAPONS: WeaponId[] = ["flame"];
