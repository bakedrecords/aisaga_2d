import { Rect } from "../engine/Rect";

/**
 * The static world: a wide playfield with a ground strip and a few platforms.
 * `solids` are everything the player, enemies and bullets collide with.
 */
export class Level {
  readonly solids: Rect[];
  readonly groundY: number;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.groundY = height - 64;
    this.solids = [
      // Ground across the whole level.
      new Rect(0, this.groundY, width, 64),
      // Platforms to jump between.
      new Rect(360, this.groundY - 120, 160, 24),
      new Rect(720, this.groundY - 200, 160, 24),
      new Rect(1100, this.groundY - 130, 200, 24),
      new Rect(1600, this.groundY - 220, 180, 24),
      new Rect(1980, this.groundY - 130, 200, 24),
    ];
  }
}
