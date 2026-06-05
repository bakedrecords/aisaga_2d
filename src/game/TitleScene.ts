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
  B: ["通常: 黒い弾（やや遅い）", "特殊(W): 黒い貫通レーザー", "ボム(K): 前方ショットガン3発"],
};

/** The opening screen: pick a character, then start. */
export class TitleScene implements Scene {
  private index = 0;

  constructor() {
    sound.setBgm(false);
  }

  update(_dt: number, input: Input, game: SceneManager): void {
    const n = CHARACTER_ORDER.length;
    if (NEXT_KEYS.some((k) => input.wasPressed(k))) this.index = (this.index + 1) % n;
    if (PREV_KEYS.some((k) => input.wasPressed(k))) this.index = (this.index + n - 1) % n;
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
