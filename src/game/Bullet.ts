import { Rect } from "../engine/Rect";
import { Vector2 } from "../engine/Vector2";
import { getSprite } from "./sprites";

export type BulletStyle = "flame" | "laser" | "dark" | "light" | "bullet" | "shuriken";

/** Bullet styles that draw a sprite (sliced from a character sheet) when its
 *  image is loaded, falling back to the procedural shapes below otherwise.
 *  `h` is the draw height as a multiple of the bullet radius; `spin` rotates
 *  the sprite over distance instead of pointing it along the velocity. */
const STYLE_SPRITES: Partial<Record<BulletStyle, { id: string; h: number; spin?: boolean }>> = {
  flame: { id: "fire", h: 2.6 },
  bullet: { id: "bullet", h: 2.4 },
  dark: { id: "miasmaS", h: 3.2 },
  laser: { id: "miasmaL", h: 5.0 },
  light: { id: "lightorb", h: 3.4 },
  shuriken: { id: "shuriken", h: 4.5, spin: true },
};

export interface BulletOptions {
  radius?: number;
  damage?: number;
  color?: string;
  /** Max travel distance (px) before the bullet despawns. */
  range?: number;
  /** Passes through enemies (still stopped by terrain), hitting each once. */
  pierce?: boolean;
  /** Special rendering (fiery blob / laser bolt / dark orb). */
  style?: BulletStyle;
}

/** A projectile flying along a velocity vector until it hits something or
 *  reaches its range. */
export class Bullet {
  pos: Vector2;
  private readonly vel: Vector2;
  readonly radius: number;
  readonly damage: number;
  readonly pierce: boolean;
  private readonly color: string;
  private readonly range: number;
  private readonly style?: BulletStyle;
  private traveled = 0;
  alive = true;
  /** Enemies already damaged — so piercing shots hit each target only once. */
  readonly hitTargets = new Set<unknown>();

  constructor(pos: Vector2, vel: Vector2, opts: BulletOptions = {}) {
    this.pos = pos;
    this.vel = vel;
    this.radius = opts.radius ?? 4;
    this.damage = opts.damage ?? 1;
    this.color = opts.color ?? "#fde047";
    this.range = opts.range ?? 600;
    this.pierce = opts.pierce ?? false;
    this.style = opts.style;
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
    const { x, y } = this.pos;
    // Sprite-backed styles: use the sheet art when loaded, else fall through.
    const spec = this.style ? STYLE_SPRITES[this.style] : undefined;
    if (spec) {
      const img = getSprite(spec.id);
      if (img) {
        this.drawDirectional(ctx, img, spec.h, spec.spin);
        return;
      }
    }
    if (this.style === "flame") {
      this.disc(ctx, "#f97316", this.radius);
      this.disc(ctx, "#fde047", this.radius * 0.55);
      return;
    }
    if (this.style === "bullet") {
      this.disc(ctx, this.color, this.radius);
      return;
    }
    if (this.style === "dark") {
      this.disc(ctx, "#a78bfa", this.radius + 2);
      this.disc(ctx, "#0b1020", this.radius);
      return;
    }
    if (this.style === "light") {
      this.disc(ctx, "#fde68a", this.radius + 2);
      this.disc(ctx, "#ffffff", this.radius);
      return;
    }
    if (this.style === "laser") {
      const angle = Math.atan2(this.vel.y, this.vel.x);
      const len = this.radius * 7;
      const h = this.radius * 1.3;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = "#a78bfa";
      ctx.fillRect(-len / 2 - 1, -h / 2 - 1, len + 2, h + 2);
      ctx.fillStyle = "#0b1020";
      ctx.fillRect(-len / 2, -h / 2, len, h);
      ctx.restore();
      return;
    }
    this.disc(ctx, this.color, this.radius);
  }

  /** Draw a sprite centred on the bullet. The art is authored pointing right
   *  (+x); height is radius × factor. Pointed along the velocity, or spun over
   *  distance (e.g. a shuriken). */
  private drawDirectional(ctx: CanvasRenderingContext2D, img: CanvasImageSource, heightFactor: number, spin = false): void {
    const { width, height } = img as unknown as { width: number; height: number };
    const h = this.radius * heightFactor;
    const w = h * (width / height);
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(spin ? this.traveled * 0.07 : Math.atan2(this.vel.y, this.vel.x));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  private disc(ctx: CanvasRenderingContext2D, color: string, r: number): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
