import type { Input } from "../engine/Input";
import type { Scene, SceneManager } from "../engine/Scene";
import { CHARACTER_ORDER, CHARACTERS, type CharacterId } from "./characters";
import { DEFAULT_LIVES, PlayScene } from "./PlayScene";
import { sound } from "./Sound";

const START_KEYS = ["Space", "KeyJ", "Enter"];
const NEXT_KEYS = ["ArrowRight", "KeyD"];
const PREV_KEYS = ["ArrowLeft", "KeyA"];

const ABILITIES: Record<CharacterId, string[]> = {
  A: ["通常: 黄色い弾（標準）", "特殊(W): 炎の拡散ショット", "ボム(K): 自分中心の大爆発"],
  B: ["通常: 闇の瘴気弾（やや遅い）", "特殊(W): 黒い貫通レーザー", "ボム(K): 召喚＋前方レーザー2連（ボス特効）"],
  C: ["通常: 白い弾（Bと同じ）", "特殊(W): 前方＋斜め上に同時発射", "ボム(K): HPを2回復", "★ 二段ジャンプ可"],
  D: ["通常: 黄色い弾（Aと同じ）", "特殊(W): マシンガン（高速連射）", "ボム(K): 3秒 時間停止（敵弾も停止）"],
  E: ["通常: 刀・近接90°（雑魚1撃・上向き可）", "特殊(W): 手裏剣（遠距離）", "ボム(K): ハンマー叩きつけ（接地敵に大ダメージ）"],
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

    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 50px system-ui, sans-serif";
    ctx.fillText("RUN & GUN", w / 2, 84);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText("─ キャラ選択 ─", w / 2, 124);

    // Character swatches in a row.
    const n = CHARACTER_ORDER.length;
    const spacing = 150;
    const startX = w / 2 - (spacing * (n - 1)) / 2;
    const cardY = 150;
    for (let i = 0; i < n; i++) {
      const ch = CHARACTERS[CHARACTER_ORDER[i]];
      const cx = startX + i * spacing;
      const selected = i === this.index;
      if (selected) {
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(cx - 28, cardY - 4, 56, 56);
      }
      ctx.fillStyle = ch.bodyColor;
      ctx.fillRect(cx - 24, cardY, 48, 48);
      ctx.fillStyle = selected ? "#e2e8f0" : "#64748b";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText(ch.name, cx, cardY + 76);
      ctx.fillStyle = selected ? ch.accent : "#64748b";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText(ch.attribute, cx, cardY + 96);
    }

    // Selected character's abilities.
    const id = CHARACTER_ORDER[this.index];
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "15px system-ui, sans-serif";
    ABILITIES[id].forEach((line, i) => ctx.fillText(line, w / 2, 286 + i * 24));

    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText("← → でキャラ選択    Space / J で決定", w / 2, 384);
    ctx.fillText("移動 A/D  ジャンプ Space  ショット J  ボム K", w / 2, 410);

    ctx.textAlign = "left";
  }
}
