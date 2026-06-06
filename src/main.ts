import { Game } from "./engine/Game";
import { TitleScene } from "./game/TitleScene";
import { TouchControls } from "./game/TouchControls";
import { loadSprite } from "./game/sprites";
import charAUrl from "./game/assets/charA_anim.png";
import fireUrl from "./game/assets/fireA.png";
import fireBigUrl from "./game/assets/fireBigA.png";
import bulletUrl from "./game/assets/bulletA.png";
import "./style.css";

// Pixel-art sheets are loaded asynchronously; characters fall back to a
// coloured box / procedural shape until their sheet is ready.
loadSprite("A", charAUrl);
loadSprite("fire", fireUrl);
loadSprite("fireBig", fireBigUrl);
loadSprite("bullet", bulletUrl);

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) {
  throw new Error("Canvas element #game was not found in the document.");
}

const TOUCH = "ontouchstart" in window || navigator.maxTouchPoints > 0;

/** Scale the canvas to fit the screen while preserving its 4:3 aspect ratio. */
function fitCanvas(c: HTMLCanvasElement): void {
  const aspect = c.width / c.height;
  let w = window.innerWidth;
  let h = w / aspect;
  if (h > window.innerHeight) {
    h = window.innerHeight;
    w = h * aspect;
  }
  if (!TOUCH) {
    // Don't upscale past native size on desktop, to keep pixels crisp.
    w = Math.min(w, c.width);
    h = Math.min(h, c.height);
  }
  c.style.width = `${Math.round(w)}px`;
  c.style.height = `${Math.round(h)}px`;
}

fitCanvas(canvas);
window.addEventListener("resize", () => fitCanvas(canvas));
window.addEventListener("orientationchange", () => fitCanvas(canvas));

const game = new Game(canvas, new TitleScene());
new TouchControls(game.input);
game.start();
