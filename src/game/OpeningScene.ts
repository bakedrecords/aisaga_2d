import type { Input } from "../engine/Input";
import type { Scene, SceneManager } from "../engine/Scene";
import { CHARACTER_ORDER, CHARACTERS, type CharacterId } from "./characters";
import { showMvLink } from "./mvLink";
import { getSprite } from "./sprites";
import { TitleScene } from "./TitleScene";

const SKIP_KEYS = ["Space", "Enter", "KeyJ", "KeyK", "ArrowUp"];
const EXPL = ["fx_expl0", "fx_expl1", "fx_expl2", "fx_expl3"];
const TITLE = "愛をさがしだせ！";

// Phase boundaries (seconds).
const P_TITLE = 3.0;
const P_HEROES = 8.0;
const P_THREAT = 10.6;
const P_CLASH = 12.3;
const TOTAL = 14.0;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** A short, skippable opening cinematic assembled from the game's sprites —
 *  title card, the five heroes, the looming boss, an explosive clash, then the
 *  logo — before handing off to the character-select title screen. */
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
    if (t < P_TITLE) this.shotTitle(ctx, w, h, t);
    else if (t < P_HEROES) this.shotHeroes(ctx, w, h, t - P_TITLE);
    else if (t < P_THREAT) this.shotThreat(ctx, w, h, t - P_HEROES);
    else if (t < P_CLASH) this.shotClash(ctx, w, h, t - P_THREAT);
    else this.shotLogo(ctx, w, h, t - P_CLASH);

    // Cinematic letterbox + a skip hint.
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, 42);
    ctx.fillRect(0, h - 42, w, 42);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "13px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("SKIP ▶ Space / タップ", w - 14, h - 16);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }

  // ---- shots --------------------------------------------------------------

  private shotTitle(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    this.drawBg(ctx, "stage2_bg", w, h, t, 16, clamp01(t / 1.2));
    ctx.fillStyle = "rgba(5,8,20,0.4)";
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";
    ctx.globalAlpha = clamp01((t - 0.4) / 1.0);
    const scale = 0.82 + 0.18 * clamp01((t - 0.4) / 1.0);
    ctx.shadowColor = "#16a34a";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#4ade80";
    ctx.font = `bold ${Math.round(46 * scale)}px system-ui, sans-serif`;
    ctx.fillText(TITLE, w / 2, h / 2 - 4);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = clamp01((t - 1.3) / 1.0);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText("銀幕一楼と TIMECAFE", w / 2, h / 2 + 36);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    this.fadeOut(ctx, w, h, t, P_TITLE);
  }

  private shotHeroes(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    this.drawBg(ctx, "stage1_bg", w, h, t + 6, 12, 0.6);
    ctx.fillStyle = "rgba(8,10,24,0.5)";
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";
    ctx.globalAlpha = clamp01(t / 0.5);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.fillText("― 5人の戦士 ―", w / 2, 78);
    ctx.globalAlpha = 1;

    const order = CHARACTER_ORDER;
    const n = order.length;
    const slot = 0.86;
    const spacing = 150;
    const startX = w / 2 - (spacing * (n - 1)) / 2;
    const rowY = h / 2 + 96;
    for (let i = 0; i < n; i++) {
      const intro = t - (0.3 + i * slot);
      if (intro < 0) continue;
      const id = order[i];
      const ch = CHARACTERS[id];
      const cx = startX + i * spacing;
      const ease = clamp01(intro / 0.4);
      const a = clamp01(intro / 0.3);
      const yoff = (1 - ease) * 64;
      this.drawChar(ctx, id, cx, rowY + yoff, 122, a);
      if (intro < 0.36) this.drawFx(ctx, "fx_hit", cx, rowY + yoff - 50, 1.4, clamp01(1 - intro / 0.36));
      ctx.textAlign = "center";
      ctx.globalAlpha = a;
      ctx.fillStyle = ch.accent;
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillText(ch.name, cx, rowY + 26);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(ch.attribute, cx, rowY + 44);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "left";
    this.fadeOut(ctx, w, h, t, P_HEROES - P_TITLE);
  }

  private shotThreat(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    this.drawBg(ctx, "stage3_bg", w, h, t + 2, 8, clamp01(t / 0.5));
    const boss = getSprite("boss");
    if (boss) {
      const { width, height } = boss as unknown as { width: number; height: number };
      const ease = clamp01(t / 1.2);
      const bh = 300 + 70 * ease;
      const bw = bh * (width / height);
      const bx = w * 0.6 + (1 - ease) * 220;
      ctx.save();
      ctx.globalAlpha = clamp01(t / 0.6);
      ctx.imageSmoothingEnabled = false;
      ctx.translate(bx + bw / 2, 0); // dragon faces the heroes (mirror)
      ctx.scale(-1, 1);
      ctx.drawImage(boss, 0, 0, width, height, 0, h - 42 - bh, bw, bh);
      ctx.restore();
    }
    // Sporadic lightning flashes.
    if (t < 0.18 || Math.sin(t * 9.2) > 0.86) {
      ctx.fillStyle = "rgba(200,210,255,0.5)";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.textAlign = "center";
    ctx.globalAlpha = clamp01((t - 0.5) / 0.6);
    ctx.shadowColor = "#7c3aed";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#c084fc";
    ctx.font = "bold 30px system-ui, sans-serif";
    ctx.fillText("強大な敵が待ち受ける", w / 2, 104);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    this.fadeOut(ctx, w, h, t, P_THREAT - P_HEROES);
  }

  private shotClash(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    this.drawBg(ctx, "stage2_bg", w, h, t, 80, 0.85);
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      const px = (i * 137 + 70) % w;
      const py = 120 + ((i * 91) % 260);
      const ph = ((t * 2.2 + i * 0.27) % 1);
      this.drawFx(ctx, EXPL[Math.min(3, Math.floor(ph * 4))], px, py, 1.6, clamp01(1.2 - ph));
    }
    // flash into the logo
    if (t > P_CLASH - P_THREAT - 0.4) {
      ctx.fillStyle = `rgba(255,255,255,${clamp01((t - (P_CLASH - P_THREAT - 0.4)) / 0.4)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private shotLogo(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
    this.drawBg(ctx, "stage2_bg", w, h, t + 4, 6, 0.45);
    ctx.fillStyle = "rgba(5,6,15,0.5)";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.shadowColor = "#16a34a";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 52px system-ui, sans-serif";
    ctx.fillText(TITLE, w / 2, h / 2);
    ctx.shadowBlur = 0;
    if (Math.floor(t * 2) % 2 === 0) {
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText("PRESS START", w / 2, h / 2 + 62);
    }
    ctx.textAlign = "left";
    // opening white flash settling in
    if (t < 0.4) {
      ctx.fillStyle = `rgba(255,255,255,${clamp01(1 - t / 0.4)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ---- helpers ------------------------------------------------------------

  private fadeOut(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, phaseLen: number): void {
    if (t > phaseLen - 0.45) {
      ctx.fillStyle = `rgba(0,0,0,${clamp01((t - (phaseLen - 0.45)) / 0.45)})`;
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

  private drawChar(ctx: CanvasRenderingContext2D, id: CharacterId, cx: number, footY: number, dh: number, alpha: number): void {
    const ch = CHARACTERS[id];
    const cfg = ch.sprite;
    const sheet = cfg ? getSprite(id) : undefined;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (cfg && sheet) {
      const dw = dh * (cfg.frameW / cfg.frameH);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sheet, 0, 0, cfg.frameW, cfg.frameH, cx - dw / 2, footY - dh, dw, dh);
    } else {
      ctx.fillStyle = ch.bodyColor;
      ctx.fillRect(cx - 24, footY - 56, 48, 56);
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
}
