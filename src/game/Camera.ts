import { clamp } from "../engine/Vector2";

/** A horizontal camera that follows a target, with a decaying screen shake. */
export class Camera {
  x = 0;
  shakeX = 0;
  shakeY = 0;
  private trauma = 0;

  constructor(
    private readonly viewWidth: number,
    private readonly worldWidth: number,
  ) {}

  follow(targetCenterX: number): void {
    const maxX = Math.max(0, this.worldWidth - this.viewWidth);
    this.x = clamp(targetCenterX - this.viewWidth / 2, 0, maxX);
  }

  /** Add a shake impulse (kept if stronger than the current one). */
  shake(amount: number): void {
    this.trauma = Math.min(1, Math.max(this.trauma, amount / 20));
  }

  update(dt: number): void {
    if (this.trauma > 0) {
      const mag = this.trauma * this.trauma * 16;
      this.shakeX = (Math.random() * 2 - 1) * mag;
      this.shakeY = (Math.random() * 2 - 1) * mag;
      this.trauma = Math.max(0, this.trauma - dt * 2.2);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }
}
