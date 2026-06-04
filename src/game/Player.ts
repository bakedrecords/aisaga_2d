import type { Input } from "../engine/Input";
import { clamp, Vector2 } from "../engine/Vector2";

/** A placeholder player: a circle the user can move around with the keyboard. */
export class Player {
  private position: Vector2;
  private readonly speed = 240; // pixels per second
  private readonly radius = 16;

  constructor(x: number, y: number) {
    this.position = new Vector2(x, y);
  }

  update(dt: number, input: Input, bounds: Vector2): void {
    const velocity = input.direction().scale(this.speed * dt);
    const next = this.position.add(velocity);

    // Keep the player fully inside the playfield.
    this.position = new Vector2(
      clamp(next.x, this.radius, bounds.x - this.radius),
      clamp(next.y, this.radius, bounds.y - this.radius),
    );
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
