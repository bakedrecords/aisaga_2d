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
  // Flamethrower: a rapid short-range cone of fire.
  flame: {
    id: "flame", name: "FIRE", fireDelay: 0.045, pellets: 3, spread: 0.5,
    speed: 340, damage: 1, explosive: false, radius: 5, color: "#fb923c", range: 160, ammo: 150,
  },
};

/** Gun weapons that can be picked up / dropped (the pistol is innate). */
export const PICKUP_WEAPONS: WeaponId[] = ["flame"];
