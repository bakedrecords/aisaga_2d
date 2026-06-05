import type { Input } from "../engine/Input";
import type { Scene, SceneManager } from "../engine/Scene";
import { PlayScene } from "./PlayScene";
import { sound } from "./Sound";

const START_KEYS = ["Space", "KeyJ", "Enter"];

const ITEMS: { label: string; color: string; text: string }[] = [
  { label: "F", color: "#fb923c", text: "炎（拡散・前方広範囲）" },
  { label: "B", color: "#fbbf24", text: "ボム（自分中心の大範囲・別ボタン K）" },
  { label: "+", color: "#4ade80", text: "回復（HP+1）" },
  { label: "$", color: "#38bdf8", text: "スコアボーナス" },
];

/** The opening screen: start prompt, controls, and an item legend. */
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
    ctx.font = "bold 52px system-ui, sans-serif";
    ctx.fillText("RUN & GUN", w / 2, 96);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "22px system-ui, sans-serif";
    ctx.fillText("Space / J でスタート", w / 2, 150);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(
      "移動 A/D・←→  ジャンプ Space  照準 ↑↓＋方向  ショット J  ボム K",
      w / 2,
      188,
    );

    // Item legend.
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText("─ アイテム ─", w / 2, 236);

    const left = w / 2 - 185;
    let y = 270;
    for (const item of ITEMS) {
      ctx.textAlign = "left";
      ctx.fillStyle = item.color;
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillText(item.label, left, y);
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "15px system-ui, sans-serif";
      ctx.fillText(item.text, left + 28, y);
      y += 28;
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText("全3ステージ。最後はボスを倒せ！", w / 2, y + 16);

    ctx.textAlign = "left";
  }
}
