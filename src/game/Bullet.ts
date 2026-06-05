import { Rect } from "../engine/Rect";
import { Vector2 } from "../engine/Vector2";

export interface BulletOptions {
  radius?: number;
  damage?: number;
  explosive?: boolean;
  color?: string;
  /** Max travel distance (px) before the bullet despawns. */
  range?: number;
}

/** A projectile flying along a velocity vector until it hits something or
 *  reaches its range. */
export class Bullet {
  pos: Vector2;
  private readonly vel: Vector2;
  readonly radius: number;
  readonly damage: number;
  readonly explosive: boolean;
  private readonly color: string;
  private readonly range: number;
  private traveled = 0;
  alive = true;

  constructor(pos: Vector2, vel: Vector2, opts: BulletOptions = {}) {
    this.pos = pos;
    this.vel = vel;
    this.radius = opts.radius ?? 4;
    this.damage = opts.damage ?? 1;
    this.explosive = opts.explosive ?? false;
    this.color = opts.color ?? "#fde047";
    this.range = opts.range ?? 600;
  }

  update(dt: number): void {
    const step = this.vel.scale(dt);
    this.pos = this.pos.add(step);
    this.traveled += step.length;
    if (this.traveled >= this.range) this.alive = false;
  }

  get bounds(): Rect {
    return new Rect(
      this.pos.x - this.radius,
      this.pos.y - this.radius,
      this.radius * 2,
      this.radius * 2,
    );
  }

  kill(): void {
    this.alive = false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
