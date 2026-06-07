import type { Input } from "../engine/Input";
import type { Scene, SceneManager } from "../engine/Scene";
import { CHARACTER_ORDER, CHARACTERS, type CharacterId } from "./characters";
import { showMvLink } from "./mvLink";
import { getSprite } from "./sprites";
import { TitleScene } from "./TitleScene";

const SKIP_KEYS = ["Space", "Enter", "KeyJ", "KeyK", "ArrowUp"];
const EXPL = ["fx_expl0", "fx_expl1", "fx_expl2", "fx_expl3"];

// Which sheet frame + signature effect to show for each hero's skill beat.
const HERO: Record<CharacterId, { frame: number; fx: string }> = {
  A: { frame: 16, fx: "fire" },
  B: { frame: 15, fx: "summon" },
  C: { frame: 12, fx: "heal" },
  D: { frame: 17, fx: "time" },
  E: { frame: 11, fx: "slash" },
};

// Phase boundaries (seconds).
const P_CITY = 2.6;
const P_DRAGON = 5.4;
const HERO_LEN = 1.3;
const P_HEROES = P_DRAGON + HERO_LEN * 5; // 11.9
const TOTAL = P_HEROES + 0.4;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** A short, text-free opening cinematic built from the game's sprites: a sweep
 *  of the city, the looming dragon, then each of the five heroes flashing their
 *  signature skill before vanishing — handing off to the character select. */
export class OpeningScene implements Scene {
  private t = 0;

  constructor() {
    showMvLink(false);
  }

  update(dt: number, input: Input, game: SceneManager): void {
    this.t += dt;
    const skip = SKIP_KEYS.some((k) => input.wasPressed(k));
    if (skip || this.t >= TOTAL) game.changeScene(new TitleScene());
  }

  render(ctx: CanvasRenderingContext2D): void {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.fillStyle = "#05060f";
    ctx.fillRect(0, 0, w, h);
    const t = this.t;
    if (t < P_CITY) this.shotCity(ctx, w, h, t);
    else if (t < P_DRAGON) this.shotDragon(ctx, w, h, t - P_CITY);
    else if (t < P_HEROES) {
      const k = Math.floor((t - P_DRAGON) / HERO_LEN);
      this.shotHero(ctx, w, h, CHARACTER_ORDER[k], (t - P_DRAGON) - k * HERO_LEN);
    } else {
      // fade to the character-select screen
      ctx.fillStyle = `rgba(0,0,0,${clamp01((t - P_HEROES) / 0.4)})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Cinematic letterbox + skip hint (no other text).
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, 42);
    ctx.fillRect(0, h - 42, w, 42);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "13px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("SKIP ▶", w - 14, h - 16);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }

  // ---- shots --------------------------------------------------------------

  private shotCity(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    this.drawBg(ctx, "stage2_bg", w, h, t, 22, clamp01(t / 0.8));
    // a couple of distant flashes for life
    if (Math.sin(t * 5) > 0.9) {
      this.drawFx(ctx, EXPL[2], w * 0.3, h * 0.45, 1.2, 0.5);
    }
    this.fadeEdges(ctx, w, h, t, P_CITY);
  }

  private shotDragon(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    this.drawBg(ctx, "stage3_bg", w, h, t + 2, 9, clamp01(t / 0.5));
    const boss = getSprite("boss");
    if (boss) {
      const { width, height } = boss as unknown as { width: number; height: number };
      const ease = clamp01(t / 1.3);
      const bh = 300 + 80 * ease;
      const bw = bh * (width / height);
      const bx = w * 0.58 + (1 - ease) * 240;
      ctx.save();
      ctx.globalAlpha = clamp01(t / 0.6);
      ctx.imageSmoothingEnabled = false;
      ctx.translate(bx + bw / 2, 0); // mirror so it faces the heroes
      ctx.scale(-1, 1);
      ctx.drawImage(boss, 0, 0, width, height, 0, h - 42 - bh, bw, bh);
      ctx.restore();
    }
    if (t < 0.18 || Math.sin(t * 9.5) > 0.85) {
      ctx.fillStyle = "rgba(200,210,255,0.5)";
      ctx.fillRect(0, 0, w, h);
    }
    this.fadeEdges(ctx, w, h, t, P_DRAGON - P_CITY);
  }

  private shotHero(ctx: CanvasRenderingContext2D, w: number, h: number, id: CharacterId, lt: number): void {
    const ch = CHARACTERS[id];
    const cx = w / 2;
    const footY = h * 0.82;
    const inA = clamp01(lt / 0.22);
    const outA = 1 - clamp01((lt - 0.98) / 0.3);
    const alpha = Math.min(inA, outA);
    const skillT = clamp01((lt - 0.22) / 0.72);

    // accent spotlight behind the hero
    const g = ctx.createRadialGradient(cx, footY - 80, 30, cx, footY - 80, h * 0.7);
    g.addColorStop(0, this.tint(ch.accent, 0.5 * alpha));
    g.addColorStop(1, "rgba(5,6,15,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // hero entrance slide
    const yoff = (1 - clamp01(lt / 0.3)) * 40;
    this.drawHeroFx(ctx, id, cx, footY - yoff, skillT, alpha, "back");
    this.drawCharFrame(ctx, id, HERO[id].frame, cx, footY - yoff, 240, alpha);
    this.drawHeroFx(ctx, id, cx, footY - yoff, skillT, alpha, "front");

    // vanish flash on the hero
    if (lt > 0.98) {
      const f = clamp01((lt - 0.98) / 0.3);
      this.drawFx(ctx, "fx_hit", cx, footY - 90, 2.0 + f * 2, 1 - f);
      ctx.fillStyle = this.tint("#ffffff", f * 0.4);
      ctx.fillRect(0, 0, w, h);
    }
  }

  /** Per-hero signature effect, split into a layer behind and in front of the
   *  character so things like the summoned demon sit correctly. */
  private drawHeroFx(ctx: CanvasRenderingContext2D, id: CharacterId, cx: number, footY: number, s: number, alpha: number, layer: "back" | "front"): void {
    const fx = HERO[id].fx;
    if (fx === "summon" && layer === "back") {
      const demon = getSprite("demonB");
      if (demon) {
        const { width, height } = demon as unknown as { width: number; height: number };
        const a = alpha * clamp01(s * 2);
        const dh = 210;
        const dw = dh * (width / height);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(demon, cx - dw / 2, footY - dh - 40 + (1 - clamp01(s * 2)) * 40, dw, dh);
        ctx.restore();
      }
      return;
    }
    if (fx === "heal" && layer === "back") {
      const pillar = getSprite("healPillar");
      if (pillar) {
        const { width, height } = pillar as unknown as { width: number; height: number };
        const ph = 260 * clamp01(s * 1.6);
        const pw = (ph * (width / height)) || 120;
        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(pillar, cx - pw / 2, footY - ph, pw, ph);
        ctx.restore();
      }
      return;
    }
    if (fx === "fire" && layer === "back") {
      // a blazing wall behind so the hero stays silhouetted in front
      this.drawFx(ctx, EXPL[Math.min(3, Math.floor(s * 4))], cx, footY - 100, 3.0, alpha);
      for (let i = 0; i < 4; i++) {
        const a = i * 1.7 + s * 5;
        this.drawFx(ctx, EXPL[(i + Math.floor(s * 4)) % 4], cx + Math.cos(a) * 105, footY - 90 + Math.sin(a) * 55, 1.4, alpha * 0.8);
      }
      return;
    }
    if (layer !== "front") return;

    if (fx === "fire") {
      this.drawFx(ctx, EXPL[Math.min(3, Math.floor(s * 4))], cx, footY - 22, 1.3, alpha * 0.95);
    } else if (fx === "heal") {
      this.drawFx(ctx, "healBurst", cx, footY - 80, 2.6, alpha);
    } else if (fx === "summon") {
      this.drawFx(ctx, "fx_hit", cx, footY - 110, 2.0, alpha * (1 - s));
    } else if (fx === "time") {
      ctx.save();
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const rp = (s + i * 0.25) % 1;
        ctx.globalAlpha = alpha * (1 - rp);
        ctx.strokeStyle = "#67e8f9";
        ctx.beginPath();
        ctx.arc(cx, footY - 70, 24 + rp * 190, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    } else if (fx === "slash") {
      const slash = getSprite("slashE");
      if (slash) {
        const { width, height } = slash as unknown as { width: number; height: number };
        const sw = 240;
        const sh = sw * (height / width);
        ctx.save();
        ctx.globalAlpha = alpha * clamp01(1.5 - s * 1.5);
        ctx.imageSmoothingEnabled = false;
        ctx.translate(cx + 10, footY - 85);
        ctx.rotate(-0.7 + s * 1.3);
        ctx.drawImage(slash, -sw * 0.1, -sh / 2, sw, sh);
        ctx.restore();
      }
      const shuri = getSprite("shuriken");
      if (shuri) {
        const { width, height } = shuri as unknown as { width: number; height: number };
        const sx = cx - 120 + s * 280;
        const sc = 2.2;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.imageSmoothingEnabled = false;
        ctx.translate(sx, footY - 120);
        ctx.rotate(s * 22);
        ctx.drawImage(shuri, (-width * sc) / 2, (-height * sc) / 2, width * sc, height * sc);
        ctx.restore();
      }
    }
  }

  // ---- helpers ------------------------------------------------------------

  private fadeEdges(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, phaseLen: number): void {
    if (t > phaseLen - 0.4) {
      ctx.fillStyle = `rgba(0,0,0,${clamp01((t - (phaseLen - 0.4)) / 0.4)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private drawBg(ctx: CanvasRenderingContext2D, id: string, w: number, h: number, scrollT: number, speed: number, alpha: number): void {
    const img = getSprite(id);
    if (!img) return;
    const { width, height } = img as unknown as { width: number; height: number };
    const tw = width * (h / height);
    let off = (scrollT * speed) % tw;
    if (off < 0) off += tw;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    for (let x = -off; x < w; x += tw) ctx.drawImage(img, x, 0, tw, h);
    ctx.restore();
  }

  private drawCharFrame(ctx: CanvasRenderingContext2D, id: CharacterId, frame: number, cx: number, footY: number, dh: number, alpha: number): void {
    const ch = CHARACTERS[id];
    const cfg = ch.sprite;
    const sheet = cfg ? getSprite(id) : undefined;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (cfg && sheet) {
      const dw = dh * (cfg.frameW / cfg.frameH);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sheet, frame * cfg.frameW, 0, cfg.frameW, cfg.frameH, cx - dw / 2, footY - dh, dw, dh);
    } else {
      ctx.fillStyle = ch.bodyColor;
      ctx.fillRect(cx - 26, footY - 60, 52, 60);
    }
    ctx.restore();
  }

  private drawFx(ctx: CanvasRenderingContext2D, id: string, cx: number, cy: number, scale: number, alpha: number): void {
    const img = getSprite(id);
    if (!img || alpha <= 0) return;
    const { width, height } = img as unknown as { width: number; height: number };
    const w = width * scale;
    const h = height * scale;
    ctx.save();
    ctx.globalAlpha = clamp01(alpha);
    ctx.globalCompositeOperation = "lighter";
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
  }

  private tint(hex: string, alpha: number): string {
    const n = hex.replace("#", "");
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${clamp01(alpha)})`;
  }
}
