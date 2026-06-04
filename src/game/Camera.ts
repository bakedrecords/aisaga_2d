import { clamp } from "../engine/Vector2";

/** A horizontal-only camera that follows a target and stays inside the world. */
export class Camera {
  x = 0;

  constructor(
    private readonly viewWidth: number,
    private readonly worldWidth: number,
  ) {}

  follow(targetCenterX: number): void {
    const maxX = Math.max(0, this.worldWidth - this.viewWidth);
    this.x = clamp(targetCenterX - this.viewWidth / 2, 0, maxX);
  }
}
