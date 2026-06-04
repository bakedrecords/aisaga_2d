import type { Input } from "../engine/Input";
import type { Scene, SceneManager } from "../engine/Scene";
import { PlayScene } from "./PlayScene";

const START_KEYS = ["Space", "KeyJ", "Enter"];

/** The opening screen. Press a start key to begin a run. */
export class TitleScene implements Scene {
  update(_dt: number, input: Input, game: SceneManager): void {
    if (START_KEYS.some((key) => input.wasPressed(key))) {
      game.changeScene(new PlayScene(game.width, game.height));
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
    ctx.fillText("RUN & GUN", w / 2, h / 2 - 60);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "22px system-ui, sans-serif";
    ctx.fillText("Space / J でスタート", w / 2, h / 2 + 8);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillText(
      "移動 A/D・矢印    ジャンプ Space/W    ショット J（連射）",
      w / 2,
      h / 2 + 52,
    );
    ctx.fillText("右端のゴールを目指せ！", w / 2, h / 2 + 78);

    ctx.textAlign = "left";
  }
}
