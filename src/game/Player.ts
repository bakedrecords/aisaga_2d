import type { Input } from "../engine/Input";
import { Rect } from "../engine/Rect";
import { clamp } from "../engine/Vector2";
import { Bullet } from "./Bullet";
import type { Level } from "./Level";

const WIDTH = 28;
const HEIGHT = 44;
const MOVE_SPEED = 230; // px/s
const JUMP_SPEED = 700; // initial upward px/s (apex ~144px, clears the platforms)
const GRAVITY = 1700; // px/s^2
const FIRE_DELAY = 0.14; // seconds between shots while holding fire
const MAX_HP = 3;
const HIT_INVULN = 1.2; // seconds of invulnerability after a hit

/** The run-and-gun player: runs, jumps, and shoots in the facing direction. */
export class Player {
  private x: number;
  private y: number;
  private vx = 0;
  private vy = 0;
  private facing = 1;
  private onGround = false;
  private fireCooldown = 0;
  private invuln = 0;

  hp = MAX_HP;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  get maxHp(): number {
    return MAX_HP;
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  get centerX(): number {
    return this.x + WIDTH / 2;
  }

  get bounds(): Rect {
    return new Rect(this.x, this.y, WIDTH, HEIGHT);
  }

  update(dt: number, input: Input, level: Level, bullets: Bullet[]): void {
    if (this.invuln > 0) this.invuln -= dt;

    const dir = input.horizontal();
    this.vx = dir * MOVE_SPEED;
    if (dir !== 0) this.facing = dir;

    const jumpPressed =
      input.wasPressed("Space") ||
      input.wasPressed("ArrowUp") ||
      input.wasPressed("KeyW");
    if (this.onGround && jumpPressed) {
      this.vy = -JUMP_SPEED;
      this.onGround = false;
    }

    this.vy += GRAVITY * dt;

    // Move and resolve collisions one axis at a time (a stable platformer trick).
    this.x += this.vx * dt;
    this.resolveHorizontal(level);

    this.y += this.vy * dt;
    this.resolveVertical(level);

    this.x = clamp(this.x, 0, level.width - WIDTH);

    this.updateShooting(dt, input, bullets);
  }

  private resolveHorizontal(level: Level): void {
    const box = this.bounds;
    for (const solid of level.solids) {
      if (!box.intersects(solid)) continue;
      if (this.vx > 0) this.x = solid.x - WIDTH;
      else if (this.vx < 0) this.x = solid.right;
      this.vx = 0;
      box.x = this.x;
    }
  }

  private resolveVertical(level: Level): void {
    this.onGround = false;
    const box = this.bounds;
    for (const solid of level.solids) {
      if (!box.intersects(solid)) continue;
      if (this.vy > 0) {
        // Falling: land on top of the solid.
        this.y = solid.y - HEIGHT;
        this.onGround = true;
      } else if (this.vy < 0) {
        // Rising: bonk the underside.
        this.y = solid.bottom;
      }
      this.vy = 0;
      box.y = this.y;
    }
  }

  private updateShooting(dt: number, input: Input, bullets: Bullet[]): void {
    this.fireCooldown -= dt;
    const firing = input.isDown("KeyJ") || input.isDown("KeyZ");
    if (firing && this.fireCooldown <= 0) {
      const muzzleX = this.facing > 0 ? this.x + WIDTH + 4 : this.x - 4;
      const muzzleY = this.y + HEIGHT * 0.4;
      bullets.push(new Bullet(muzzleX, muzzleY, this.facing));
      this.fireCooldown = FIRE_DELAY;
    }
  }

  /** Apply a hit unless currently invulnerable. */
  hit(): void {
    if (this.invuln > 0) return;
    this.hp -= 1;
    this.invuln = HIT_INVULN;
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Blink while invulnerable.
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;

    ctx.fillStyle = "#4ade80";
    ctx.fillRect(this.x, this.y, WIDTH, HEIGHT);

    // Gun barrel pointing the way we face.
    ctx.fillStyle = "#e2e8f0";
    const gunY = this.y + HEIGHT * 0.4 - 2;
    if (this.facing > 0) ctx.fillRect(this.x + WIDTH, gunY, 12, 5);
    else ctx.fillRect(this.x - 12, gunY, 12, 5);
  }
}
