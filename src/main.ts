import { Game } from "./engine/Game";
import { TitleScene } from "./game/TitleScene";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) {
  throw new Error("Canvas element #game was not found in the document.");
}

const game = new Game(canvas, new TitleScene());
game.start();
