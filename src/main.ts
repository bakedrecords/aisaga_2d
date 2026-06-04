import { Game } from "./engine/Game";
import { PlayScene } from "./game/PlayScene";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) {
  throw new Error("Canvas element #game was not found in the document.");
}

const game = new Game(canvas, new PlayScene(canvas.width, canvas.height));
game.start();
