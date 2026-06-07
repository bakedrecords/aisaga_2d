import { getSprite } from "./sprites";

interface FxInstance {
  x: number;
  y: number;
  frames: string[];
  t: number;
  dur: number;
  scale: number;
  grow: number; // extra scale gained over the lifetime (1 = none)
  rot: number;
  spin: number;
}

export interface FxOptions {
  dur?: number;
  scale?: number;
  grow?: number;
  rot?: number;
  spin?: number;
}

/** A lightweight layer of additive, frame-animated sprite effects (hit sparks,
 *  explosions). Sprites are looked up by id each frame so it is headless-safe
 *  (skips drawing when the image isn't loaded). */
export class FxLayer {
  private list: FxInstance[] = [];

  spawn(frames: string[], x: number, y: number, opts: FxOptions = {}): void {
    this.list.push({
      x, y, frames,
      t: 0,
      dur: opts.dur ?? 0.4,
      scale: opts.scale ?? 1,
      grow: opts.grow ?? 1,
      rot: opts.rot ?? 0,
      spin: opts.spin ?? 0,
    });
  }

  update(dt: number): void {
    for (const f of this.list) {
      f.t += dt;
      f.rot += f.spin * dt;
    }
    this.list = this.list.filter((f) => f.t < f.dur);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const f of this.list) {
      const p = f.t / f.dur; // 0..1
      const idx = Math.min(f.frames.length - 1, Math.floor(p * f.frames.length));
      const img = getSprite(f.frames[idx]);
      if (!img) continue;
      const { width, height } = img as unknown as { width: number; height: number };
      const fade = p < 0.65 ? 1 : Math.max(0, 1 - (p - 0.65) / 0.35);
      const sc = f.scale * (1 + (f.grow - 1) * p);
      const w = width * sc;
      const h = height * sc;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.globalCompositeOperation = "lighter";
      ctx.imageSmoothingEnabled = true;
      ctx.translate(f.x, f.y);
      if (f.rot) ctx.rotate(f.rot);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }
}

export const EXPLOSION_FRAMES = ["fx_expl0", "fx_expl1", "fx_expl2", "fx_expl3"];
export const HIT_FRAMES = ["fx_hit"];
