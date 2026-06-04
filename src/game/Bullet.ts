import { Rect } from "../engine/Rect";

const SPEED = 680; // pixels per second
const RADIUS = 4;

/** A projectile that flies horizontally until it hits something or leaves the level. */
export class Bullet {
  private x: number;
  private readonly vx: number;
  alive = true;

  constructor(
    x: number,
    private y: number,
    direction: number,
  ) {
    this.x = x;
    this.vx = direction * SPEED;
  }

  update(dt: number): void {
    this.x += this.vx * dt;
  }

  get bounds(): Rect {
    return new Rect(this.x - RADIUS, this.y - RADIUS, RADIUS * 2, RADIUS * 2);
  }

  kill(): void {
    this.alive = false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(this.x, this.y, RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}
