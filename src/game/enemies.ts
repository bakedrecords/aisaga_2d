import { Rect } from "../engine/Rect";
import { clamp, Vector2 } from "../engine/Vector2";
import { Bullet } from "./Bullet";
import type { Level } from "./Level";
import type { Sound } from "./Sound";

const GRAVITY = 1700;

export interface EnemyContext {
  dt: number;
  level: Level;
  playerCenter: Vector2;
  fire: (bullet: Bullet) => void;
  audio: Sound;
}

/** Base class for all enemies: shared position, health and physics helpers. */
export abstract class Enemy {
  protected x: number;
  protected y: number;
  protected vy = 0;
  protected facing = -1;
  hp: number;
  readonly maxHp: number;
  alive = true;
  readonly score: number;

  abstract readonly w: number;
  abstract readonly h: number;
  /** Bosses get special death handling and a HUD health bar. */
  readonly isBoss: boolean = false;

  constructor(x: number, y: number, hp: number, score: number) {
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.maxHp = hp;
    this.score = score;
  }

  get bounds(): Rect {
    return new Rect(this.x, this.y, this.w, this.h);
  }

  get center(): Vector2 {
    return new Vector2(this.x + this.w / 2, this.y + this.h / 2);
  }

  damage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) this.alive = false;
  }

  protected faceToward(targetX: number): void {
    this.facing = targetX < this.center.x ? -1 : 1;
  }

  protected fallAndLand(ctx: EnemyContext): void {
    this.vy += GRAVITY * ctx.dt;
    this.y += this.vy * ctx.dt;
    const box = this.bounds;
    for (const solid of ctx.level.solids) {
      if (!box.intersects(solid)) continue;
      if (this.vy > 0) {
        this.y = solid.y - this.h;
        this.vy = 0;
      }
      box.y = this.y;
    }
  }

  abstract update(ctx: EnemyContext): void;
  abstract render(ctx: CanvasRenderingContext2D): void;
}

/** Grunt that walks toward the player along the ground. */
export class Walker extends Enemy {
  readonly w = 30;
  readonly h = 42;
  private static readonly SPEED = 76;

  constructor(x: number, groundY: number) {
    super(x, groundY - 42, 3, 100);
  }

  update(ctx: EnemyContext): void {
    this.faceToward(ctx.playerCenter.x);
    this.x += this.facing * Walker.SPEED * ctx.dt;
    this.x = clamp(this.x, 0, ctx.level.width - this.w);
    this.fallAndLand(ctx);
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#f87171";
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.fillStyle = "#1f2937";
    const eyeX = this.facing > 0 ? this.x + this.w - 10 : this.x + 4;
    ctx.fillRect(eyeX, this.y + 8, 6, 6);
  }
}

/** Keeps its distance and fires aimed shots at the player. */
export class Shooter extends Enemy {
  readonly w = 30;
  readonly h = 44;
  private fireTimer = 1;
  private static readonly SPEED = 48;
  private static readonly RANGE = 360;
  private static readonly INTERVAL = 1.6;
  private static readonly BULLET_SPEED = 330;

  constructor(x: number, groundY: number) {
    super(x, groundY - 44, 3, 150);
  }

  update(ctx: EnemyContext): void {
    this.faceToward(ctx.playerCenter.x);
    const dx = Math.abs(ctx.playerCenter.x - this.center.x);
    if (dx > Shooter.RANGE) {
      this.x += this.facing * Shooter.SPEED * ctx.dt;
      this.x = clamp(this.x, 0, ctx.level.width - this.w);
    }
    this.fallAndLand(ctx);

    this.fireTimer -= ctx.dt;
    if (this.fireTimer <= 0 && dx <= Shooter.RANGE + 80) {
      this.fireTimer = Shooter.INTERVAL;
      const dir = ctx.playerCenter.add(this.center.scale(-1)).normalized();
      ctx.fire(
        new Bullet(this.center, dir.scale(Shooter.BULLET_SPEED), {
          color: "#fca5a5",
          radius: 5,
        }),
      );
      ctx.audio.enemyShoot();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#fb923c";
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.fillStyle = "#1f2937";
    const gunY = this.y + this.h * 0.4;
    if (this.facing > 0) ctx.fillRect(this.x + this.w - 4, gunY, 12, 5);
    else ctx.fillRect(this.x - 8, gunY, 12, 5);
  }
}

/** Floats through the air toward the player on a sine wave (ignores gravity). */
export class Flyer extends Enemy {
  readonly w = 34;
  readonly h = 26;
  private t = Math.random() * Math.PI * 2;
  private baseY: number;
  private static readonly SPEED = 116;
  private static readonly AMP = 64;

  constructor(x: number, groundY: number) {
    super(x, groundY - 210, 2, 120);
    this.baseY = groundY - 210;
  }

  update(ctx: EnemyContext): void {
    this.t += ctx.dt * 3;
    this.faceToward(ctx.playerCenter.x);
    this.x += this.facing * Flyer.SPEED * ctx.dt;
    this.x = clamp(this.x, 0, ctx.level.width - this.w);
    this.y = this.baseY + Math.sin(this.t) * Flyer.AMP;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#c084fc";
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(this.x + this.w / 2 - 3, this.y + this.h - 6, 6, 4);
  }
}

/** The end-of-game boss: hovers, takes many hits and fires spreads. */
export class Boss extends Enemy {
  readonly w = 120;
  readonly h = 110;
  override readonly isBoss = true;
  private dir = -1;
  private timer = 1.5;
  private t = 0;
  private baseY: number;
  private static readonly SPEED = 64;

  constructor(x: number, groundY: number) {
    super(x, groundY - 110, 60, 2000);
    this.baseY = groundY - 110;
  }

  update(ctx: EnemyContext): void {
    this.t += ctx.dt;
    this.x += this.dir * Boss.SPEED * ctx.dt;
    if (this.x < ctx.level.width - 540) this.dir = 1;
    if (this.x > ctx.level.width - 200) this.dir = -1;
    this.y = this.baseY + Math.sin(this.t * 1.5) * 22;
    this.faceToward(ctx.playerCenter.x);

    this.timer -= ctx.dt;
    if (this.timer <= 0) {
      this.timer = 1.7;
      const dir = ctx.playerCenter.add(this.center.scale(-1)).normalized();
      const baseAngle = Math.atan2(dir.y, dir.x);
      for (let i = -2; i <= 2; i++) {
        const a = baseAngle + i * 0.17;
        ctx.fire(
          new Bullet(this.center, new Vector2(Math.cos(a), Math.sin(a)).scale(300), {
            color: "#fb7185",
            radius: 6,
          }),
        );
      }
      ctx.audio.enemyShoot();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#7f1d1d";
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.fillStyle = "#b91c1c";
    ctx.fillRect(this.x + 12, this.y + 12, this.w - 24, this.h - 36);
    ctx.fillStyle = "#fca5a5"; // eye
    const eyeX = this.facing > 0 ? this.x + this.w - 34 : this.x + 14;
    ctx.fillRect(eyeX, this.y + 28, 20, 14);
  }
}
