import type { Input } from "../engine/Input";
import type { Scene, SceneManager } from "../engine/Scene";
import { CHARACTER_ORDER, CHARACTERS, type CharacterId } from "./characters";
import { showMvLink } from "./mvLink";
import { DEFAULT_LIVES, PlayScene } from "./PlayScene";
import { sound } from "./Sound";
import { getSprite } from "./sprites";

const START_KEYS = ["Space", "KeyJ", "Enter"];
const NEXT_KEYS = ["ArrowRight", "KeyD"];
const PREV_KEYS = ["ArrowLeft", "KeyA"];

const ABILITIES: Record<CharacterId, string> = {
  A: "Skill: 自分中心の大爆発（炎）",
  B: "Skill: 召喚＋前方レーザー（ボス特効・HP-2）",
  C: "Skill: HPを2回復",
  D: "Skill: 3秒 時間停止（敵弾も停止）",
  E: "Skill: ハンマー叩きつけ（接地敵に大ダメージ）",
};

/** The opening screen: pick a character, then start. */
export class TitleScene implements Scene {
  private index = 0;
  private navCooldown = 0;

  constructor() {
    sound.setBgm(false);
  }

  update(dt: number, input: Input, game: SceneManager): void {
    const n = CHARACTER_ORDER.length;
    if (this.navCooldown > 0) this.navCooldown -= dt;
    const right = NEXT_KEYS.some((k) => input.wasPressed(k));
    const left = PREV_KEYS.some((k) => input.wasPressed(k));
    if (this.navCooldown <= 0 && right !== left) {
      this.index = right ? (this.index + 1) % n : (this.index + n - 1) % n;
      this.navCooldown = 0.16;
    }
    if (START_KEYS.some((k) => input.wasPressed(k))) {
      const id = CHARACTER_ORDER[this.index];
      game.changeScene(new PlayScene(game.width, game.height, 0, 0, DEFAULT_LIVES, id));
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    showMvLink(true);

    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 46px system-ui, sans-serif";
    ctx.fillText("愛をさがしだせ！", w / 2, 80);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText("─ キャラ選択 ─", w / 2, 124);

    // Character portraits (front-facing idle frame) in a row.
    const n = CHARACTER_ORDER.length;
    const spacing = 150;
    const startX = w / 2 - (spacing * (n - 1)) / 2;
    const cardY = 150;
    for (let i = 0; i < n; i++) {
      const ch = CHARACTERS[CHARACTER_ORDER[i]];
      const cx = startX + i * spacing;
      const selected = i === this.index;
      if (selected) {
        ctx.fillStyle = "rgba(226, 232, 240, 0.16)";
        ctx.fillRect(cx - 40, cardY - 18, 80, 94);
      }
      const cfg = ch.sprite;
      const sheet = cfg ? getSprite(ch.id) : undefined;
      if (cfg && sheet) {
        // Frame 0 of the idle row is the front view.
        const dh = 74;
        const dw = dh * (cfg.frameW / cfg.frameH);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sheet, 0, 0, cfg.frameW, cfg.frameH, cx - dw / 2, cardY + 58 - dh, dw, dh);
      } else {
        ctx.fillStyle = ch.bodyColor;
        ctx.fillRect(cx - 24, cardY + 8, 48, 48);
      }
      ctx.fillStyle = selected ? "#e2e8f0" : "#94a3b8";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText(ch.name, cx, cardY + 82);
    }

    // Selected character's skill (kept simple — just the skill line).
    const id = CHARACTER_ORDER[this.index];
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText(ABILITIES[id], w / 2, 292);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText("← → でキャラ選択    Space / J で決定", w / 2, 384);
    ctx.fillText("移動 A/D  ジャンプ Space  Attack J  Skill K", w / 2, 410);

    ctx.textAlign = "left";
  }
}
