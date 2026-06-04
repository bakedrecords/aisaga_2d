import { Vector2 } from "../engine/Vector2";

interface Particle {
  pos: Vector2;
  vel: Vector2;
  life: number;
  max: number;
  size: number;
  color: string;
  gravity: number;
}

export interface BurstOptions {
  gravity?: number;
  life?: number;
  size?: number;
}

/** A lightweight particle system for explosions, sparks and debris. */
export class Particles {
  private list: Particle[] = [];

  burst(
    pos: Vector2,
    color: string,
    count: number,
    speed: number,
    opts: BurstOptions = {},
  ): void {
    const gravity = opts.gravity ?? 600;
    const life = opts.life ?? 0.5;
    const size = opts.size ?? 3;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.65);
      this.list.push({
        pos,
        vel: new Vector2(Math.cos(angle) * s, Math.sin(angle) * s),
        life: life * (0.6 + Math.random() * 0.4),
        max: life,
        size: size * (0.6 + Math.random() * 0.8),
        color,
        gravity,
      });
    }
  }

  update(dt: number): void {
    for (const p of this.list) {
      p.vel = new Vector2(p.vel.x, p.vel.y + p.gravity * dt);
      p.pos = p.pos.add(p.vel.scale(dt));
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.pos.x - p.size / 2, p.pos.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
