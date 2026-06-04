import { Rect } from "../engine/Rect";
import { clamp } from "../engine/Vector2";
import type { Level } from "./Level";

const WIDTH = 30;
const HEIGHT = 42;
const SPEED = 72; // px/s
const GRAVITY = 1700;
const MAX_HP = 3;

/** A simple ground enemy that walks toward the player and falls with gravity. */
export class Enemy {
  private vy = 0;
  private facing = -1;
  private hp = MAX_HP;
  alive = true;

  constructor(
    private x: number,
    private y: number,
  ) {}

  get bounds(): Rect {
    return new Rect(this.x, this.y, WIDTH, HEIGHT);
  }

  update(dt: number, targetX: number, level: Level): void {
    this.facing = targetX < this.x ? -1 : 1;
    this.x += this.facing * SPEED * dt;
    this.x = clamp(this.x, 0, level.width - WIDTH);

    // Gravity + land on solids (enemies don't climb, they just walk and fall).
    this.vy += GRAVITY * dt;
    this.y += this.vy * dt;
    const box = this.bounds;
    for (const solid of level.solids) {
      if (!box.intersects(solid)) continue;
      if (this.vy > 0) {
        this.y = solid.y - HEIGHT;
        this.vy = 0;
      }
      box.y = this.y;
    }
  }

  damage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) this.alive = false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#f87171";
    ctx.fillRect(this.x, this.y, WIDTH, HEIGHT);

    // An "eye" hints at the facing direction.
    ctx.fillStyle = "#1f2937";
    const eyeX = this.facing > 0 ? this.x + WIDTH - 10 : this.x + 4;
    ctx.fillRect(eyeX, this.y + 8, 6, 6);
  }
}
