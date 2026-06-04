import type { Input } from "../engine/Input";
import type { Scene, SceneManager } from "../engine/Scene";
import { PlayScene } from "./PlayScene";
import { sound } from "./Sound";

const START_KEYS = ["Space", "KeyJ", "Enter"];

/** The opening screen. Press a start key to begin from stage 1. */
export class TitleScene implements Scene {
  constructor() {
    sound.setBgm(false);
  }

  update(_dt: number, input: Input, game: SceneManager): void {
    if (START_KEYS.some((key) => input.wasPressed(key))) {
      game.changeScene(new PlayScene(game.width, game.height, 0, 0));
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";

    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 56px system-ui, sans-serif";
    ctx.fillText("RUN & GUN", w / 2, h / 2 - 80);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "22px system-ui, sans-serif";
    ctx.fillText("Space / J でスタート", w / 2, h / 2 - 24);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "15px system-ui, sans-serif";
    const lines = [
      "移動 A/D・←→     ジャンプ Space     ショット J（連射）",
      "照準 ↑/↓ ＋ 方向で斜め撃ち     しゃがみ ↓     武器は箱で入手",
      "全3ステージ。最後はボスを倒せ！",
    ];
    lines.forEach((line, i) => ctx.fillText(line, w / 2, h / 2 + 24 + i * 26));

    ctx.textAlign = "left";
  }
}
