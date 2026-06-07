import { Rect } from "../engine/Rect";
import { clamp, Vector2 } from "../engine/Vector2";
import { Bullet } from "./Bullet";
import type { Level } from "./Level";
import type { Sound } from "./Sound";
import { getSprite } from "./sprites";

/** A sliced enemy sprite sheet (one row of frames). */
interface EnemySpriteCfg {
  id: string;
  fw: number;
  fh: number;
  fps: number;
  move: number[];
  attack?: number[];
  faceRight: boolean; // true if the art faces +x
  scale?: number; // draw height = enemy height × scale
}

const ENEMY_SPRITES = {
  // The golems / reaper / mage art faces +x; the dragon faces -x.
  walker: { id: "walker", fw: 102, fh: 68, fps: 7, move: [0, 1, 2, 3], faceRight: true, scale: 1.3 },
  shooter: { id: "shooter", fw: 100, fh: 68, fps: 6, move: [0, 1, 2, 3], attack: [4, 5], faceRight: true, scale: 1.3 },
  flyer: { id: "flyer", fw: 114, fh: 83, fps: 7, move: [0, 1, 2, 3, 4], faceRight: true, scale: 1.7 },
  brute: { id: "brute", fw: 192, fh: 227, fps: 1, move: [0], faceRight: true, scale: 1.4 },
  boss: { id: "boss", fw: 424, fh: 410, fps: 1, move: [0], faceRight: false, scale: 1.2 },
} satisfies Record<string, EnemySpriteCfg>;

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
  protected onGround = false;
  /** Per-instance time with a random start phase, so enemies desync. */
  protected t = Math.random() * Math.PI * 2;
  protected attackFx = 0; // brief timer to show the attack animation
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

  /** Draw the enemy's sprite if its sheet is loaded; returns true if it drew.
   *  Foot-anchored, centred on the hitbox, flipped to face the player. */
  protected renderSprite(ctx: CanvasRenderingContext2D, cfg: EnemySpriteCfg): boolean {
    const img = getSprite(cfg.id);
    if (!img) return false;
    const frames = this.attackFx > 0 && cfg.attack ? cfg.attack : cfg.move;
    const frame = frames[Math.floor(this.t * cfg.fps) % frames.length];
    const drawH = this.h * (cfg.scale ?? 1.2);
    const drawW = drawH * (cfg.fw / cfg.fh);
    const cx = this.x + this.w / 2;
    const dy = this.y + this.h - drawH; // feet on the hitbox bottom
    const flip = cfg.faceRight ? this.facing < 0 : this.facing > 0;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (flip) {
      ctx.translate(cx + drawW / 2, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, frame * cfg.fw, 0, cfg.fw, cfg.fh, 0, 0, drawW, drawH);
    } else {
      ctx.drawImage(img, frame * cfg.fw, 0, cfg.fw, cfg.fh, cx - drawW / 2, dy, drawW, drawH);
    }
    ctx.restore();
    return true;
  }

  protected fallAndLand(ctx: EnemyContext): void {
    this.onGround = false;
    this.vy += GRAVITY * ctx.dt;
    this.y += this.vy * ctx.dt;
    const box = this.bounds;
    for (const solid of ctx.level.solids) {
      if (!box.intersects(solid)) continue;
      if (this.vy > 0) {
        this.y = solid.y - this.h;
        this.vy = 0;
        this.onGround = true;
      }
      box.y = this.y;
    }
  }

  /** A small floating health bar; drawn by tough enemies when hurt. */
  protected drawHealthBar(ctx: CanvasRenderingContext2D): void {
    if (this.hp >= this.maxHp) return;
    const y = this.y - 8;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(this.x, y, this.w, 4);
    ctx.fillStyle = "#f87171";
    ctx.fillRect(this.x, y, this.w * Math.max(0, this.hp / this.maxHp), 4);
  }

  abstract update(ctx: EnemyContext): void;
  abstract render(ctx: CanvasRenderingContext2D): void;
}

/** Grunt that advances with a varying pace and the odd hop. */
export class Walker extends Enemy {
  readonly w = 45;
  readonly h = 63;
  private readonly speedBase = 62 + Math.random() * 44;
  private hopTimer = 1 + Math.random() * 2.5;

  constructor(x: number, groundY: number) {
    super(x, groundY - 63, 3, 100);
  }

  update(ctx: EnemyContext): void {
    this.t += ctx.dt;
    this.faceToward(ctx.playerCenter.x);
    // Pulse the pace so it speeds up and slows down instead of a constant crawl.
    const pace = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(this.t * 2.4));
    this.x += this.facing * this.speedBase * pace * ctx.dt;
    this.x = clamp(this.x, 0, ctx.level.width - this.w);

    this.hopTimer -= ctx.dt;
    if (this.hopTimer <= 0 && this.onGround) {
      this.vy = -470;
      this.hopTimer = 1.6 + Math.random() * 2.4;
    }
    this.fallAndLand(ctx);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.renderSprite(ctx, ENEMY_SPRITES.walker)) return;
    ctx.fillStyle = "#f87171";
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.fillStyle = "#1f2937";
    const eyeX = this.facing > 0 ? this.x + this.w - 10 : this.x + 4;
    ctx.fillRect(eyeX, this.y + 8, 6, 6);
  }
}

/** Keeps its distance — advances when far, backs off when close — and fires
 *  aimed shots at irregular intervals. */
export class Shooter extends Enemy {
  readonly w = 45;
  readonly h = 66;
  private fireTimer = 1;
  private static readonly SPEED = 52;
  private static readonly RANGE = 360;
  private static readonly INTERVAL = 1.6;
  private static readonly BULLET_SPEED = 280;

  constructor(x: number, groundY: number) {
    super(x, groundY - 66, 3, 150);
  }

  update(ctx: EnemyContext): void {
    this.t += ctx.dt;
    if (this.attackFx > 0) this.attackFx -= ctx.dt;
    this.faceToward(ctx.playerCenter.x);
    const dx = Math.abs(ctx.playerCenter.x - this.center.x);
    if (dx > Shooter.RANGE) {
      this.x += this.facing * Shooter.SPEED * ctx.dt;
    } else if (dx < Shooter.RANGE * 0.6) {
      this.x -= this.facing * Shooter.SPEED * ctx.dt; // back away
    }
    this.x = clamp(this.x, 0, ctx.level.width - this.w);
    this.fallAndLand(ctx);

    this.fireTimer -= ctx.dt;
    if (this.fireTimer <= 0 && dx <= Shooter.RANGE + 80) {
      this.fireTimer = Shooter.INTERVAL * (0.7 + Math.random() * 0.7);
      this.attackFx = 0.35; // show the cast pose briefly
      const dir = ctx.playerCenter.add(this.center.scale(-1)).normalized();
      ctx.fire(
        new Bullet(this.center, dir.scale(Shooter.BULLET_SPEED), {
          color: "#fca5a5",
          radius: 5,
          range: 520,
        }),
      );
      ctx.audio.enemyShoot();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.renderSprite(ctx, ENEMY_SPRITES.shooter)) return;
    ctx.fillStyle = "#fb923c";
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.fillStyle = "#1f2937";
    const gunY = this.y + this.h * 0.4;
    if (this.facing > 0) ctx.fillRect(this.x + this.w - 4, gunY, 12, 5);
    else ctx.fillRect(this.x - 8, gunY, 12, 5);
  }
}

/** Floats toward the player with a per-instance wobble, slowly homing in on
 *  the player's height (ignores gravity). */
export class Flyer extends Enemy {
  readonly w = 51;
  readonly h = 39;
  private readonly amp = 42 + Math.random() * 64;
  private readonly freq = 1.8 + Math.random() * 2.2;
  private readonly flySpeed = 92 + Math.random() * 66;
  private baseY: number;

  constructor(x: number, groundY: number) {
    super(x, groundY - 200, 2, 120);
    this.baseY = groundY - 180 - Math.random() * 120;
  }

  update(ctx: EnemyContext): void {
    this.t += ctx.dt;
    this.faceToward(ctx.playerCenter.x);
    this.x += this.facing * this.flySpeed * ctx.dt;
    this.x = clamp(this.x, 0, ctx.level.width - this.w);

    const target = ctx.playerCenter.y - this.h / 2;
    this.baseY += (target - this.baseY) * 0.35 * ctx.dt;
    this.baseY = clamp(this.baseY, 70, ctx.level.groundY - 90);
    this.y = this.baseY + Math.sin(this.t * this.freq) * this.amp;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.renderSprite(ctx, ENEMY_SPRITES.flyer)) return;
    ctx.fillStyle = "#c084fc";
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(this.x + this.w / 2 - 3, this.y + this.h - 6, 6, 4);
  }
}

/** Mid-stage mini-boss: a big bruiser that periodically charges. */
export class Brute extends Enemy {
  readonly w = 87;
  readonly h = 96;
  private static readonly SPEED = 46;
  private chargeTimer = 2 + Math.random() * 2;
  private charging = 0;

  constructor(x: number, groundY: number) {
    super(x, groundY - 96, 14, 600);
  }

  update(ctx: EnemyContext): void {
    this.t += ctx.dt;
    this.faceToward(ctx.playerCenter.x);

    this.chargeTimer -= ctx.dt;
    if (this.chargeTimer <= 0) {
      this.charging = 0.7;
      this.chargeTimer = 2.6 + Math.random() * 2;
    }
    const speed = this.charging > 0 ? Brute.SPEED * 3.2 : Brute.SPEED;
    if (this.charging > 0) this.charging -= ctx.dt;

    this.x += this.facing * speed * ctx.dt;
    this.x = clamp(this.x, 0, ctx.level.width - this.w);
    this.fallAndLand(ctx);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.renderSprite(ctx, ENEMY_SPRITES.brute)) {
      this.drawHealthBar(ctx);
      return;
    }
    const charging = this.charging > 0;
    ctx.fillStyle = charging ? "#c2410c" : "#9a3412";
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.fillStyle = "#7c2d12";
    ctx.fillRect(this.x + 8, this.y + 10, this.w - 16, this.h - 24);
    ctx.fillStyle = charging ? "#fde047" : "#fca5a5";
    const eyeX = this.facing > 0 ? this.x + this.w - 20 : this.x + 8;
    ctx.fillRect(eyeX, this.y + 16, 12, 9);
    this.drawHealthBar(ctx);
  }
}

/** The end-of-game boss: hovers and cycles through several attack patterns. */
export class Boss extends Enemy {
  readonly w = 180;
  readonly h = 165;
  override readonly isBoss = true;
  private dir = -1;
  private timer = 1.5;
  private pattern = 0;
  private windup = false;
  private baseY: number;
  private static readonly SPEED = 64;

  constructor(x: number, groundY: number) {
    super(x, groundY - 165, 60, 2000);
    this.baseY = groundY - 165;
  }

  private get enraged(): boolean {
    return this.hp <= this.maxHp * 0.4;
  }

  update(ctx: EnemyContext): void {
    this.t += ctx.dt;
    const speed = this.enraged ? Boss.SPEED * 1.4 : Boss.SPEED;
    this.x += this.dir * speed * ctx.dt;
    if (this.x < ctx.level.width - 540) this.dir = 1;
    if (this.x > ctx.level.width - 200) this.dir = -1;
    this.y = this.baseY + Math.sin(this.t * 1.5) * 22;
    this.faceToward(ctx.playerCenter.x);

    this.timer -= ctx.dt;
    this.windup = this.timer < 0.3;
    if (this.timer <= 0) {
      this.timer = this.enraged ? 1.3 : 2.0;
      this.firePattern(ctx);
      this.pattern = (this.pattern + 1) % 3;
      ctx.audio.enemyShoot();
    }
  }

  private firePattern(ctx: EnemyContext): void {
    const toPlayer = ctx.playerCenter.add(this.center.scale(-1)).normalized();
    const aim = Math.atan2(toPlayer.y, toPlayer.x);
    const shoot = (angle: number, speed: number) =>
      ctx.fire(
        new Bullet(this.center, new Vector2(Math.cos(angle), Math.sin(angle)).scale(speed), {
          color: "#fb7185",
          radius: 6,
          range: 640,
        }),
      );

    if (this.pattern === 0) {
      for (let i = -2; i <= 2; i++) shoot(aim + i * 0.17, 260);
    } else if (this.pattern === 1) {
      const n = this.enraged ? 16 : 12;
      for (let i = 0; i < n; i++) shoot((i / n) * Math.PI * 2, 200);
    } else {
      for (let i = -1; i <= 1; i++) shoot(aim + i * 0.06, 320);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.renderSprite(ctx, ENEMY_SPRITES.boss)) return;
    ctx.fillStyle = this.windup ? "#b91c1c" : "#7f1d1d";
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.fillStyle = this.enraged ? "#ef4444" : "#b91c1c";
    ctx.fillRect(this.x + 12, this.y + 12, this.w - 24, this.h - 36);
    ctx.fillStyle = this.windup ? "#fef08a" : "#fca5a5";
    const eyeX = this.facing > 0 ? this.x + this.w - 34 : this.x + 14;
    ctx.fillRect(eyeX, this.y + 28, 20, 14);
  }
}
