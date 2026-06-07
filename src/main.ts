import { Game } from "./engine/Game";
import { OpeningScene } from "./game/OpeningScene";
import { TouchControls } from "./game/TouchControls";
import { loadSprite } from "./game/sprites";
import charAUrl from "./game/assets/charA_anim.png";
import charBUrl from "./game/assets/charB_anim.png";
import charCUrl from "./game/assets/charC_anim.png";
import charDUrl from "./game/assets/charD_anim.png";
import charEUrl from "./game/assets/charE_anim.png";
import downBUrl from "./game/assets/downB.png";
import downCUrl from "./game/assets/downC.png";
import downDUrl from "./game/assets/downD.png";
import downEUrl from "./game/assets/downE.png";
import fireUrl from "./game/assets/fireA.png";
import fireBigUrl from "./game/assets/fireBigA.png";
import bulletUrl from "./game/assets/bulletA.png";
import bulletMgUrl from "./game/assets/bulletMG.png";
import miasmaSUrl from "./game/assets/miasmaS.png";
import miasmaLUrl from "./game/assets/miasmaL.png";
import lightorbUrl from "./game/assets/lightorb.png";
import shurikenUrl from "./game/assets/shuriken.png";
import demonUrl from "./game/assets/demonB.png";
import summonCircleUrl from "./game/assets/summonCircle.png";
import dashUrl from "./game/assets/dashE.png";
import shockUrl from "./game/assets/shockE.png";
import healBurstUrl from "./game/assets/heal_burst.png";
import healPillarUrl from "./game/assets/heal_pillar.png";
import hammerPoseUrl from "./game/assets/hammerPoseE.png";
import hammerSlamUrl from "./game/assets/hammerSlamE.png";
import slashUrl from "./game/assets/slashE.png";
import walkerUrl from "./game/assets/walker.png";
import shooterUrl from "./game/assets/shooter.png";
import flyerUrl from "./game/assets/flyer.png";
import bruteUrl from "./game/assets/brute.png";
import bossUrl from "./game/assets/boss.png";
import miasmaEUrl from "./game/assets/miasmaE.png";
import lightningEUrl from "./game/assets/lightningE.png";
import stage1BgUrl from "./game/assets/stage1_bg.png";
import stage2BgUrl from "./game/assets/stage2_bg.png";
import stage3BgUrl from "./game/assets/stage3_bg.png";
import stage1FloorUrl from "./game/assets/stage1_floor.png";
import stage2FloorUrl from "./game/assets/stage2_floor.png";
import stage3FloorUrl from "./game/assets/stage3_floor.png";
import itemGoldUrl from "./game/assets/item_gold.png";
import itemDrinkUrl from "./game/assets/item_drink.png";
import itemWUrl from "./game/assets/item_w.png";
import itemSUrl from "./game/assets/item_s.png";
import itemCrossUrl from "./game/assets/item_heart.png";
import fxExpl0Url from "./game/assets/fx_expl0.png";
import fxExpl1Url from "./game/assets/fx_expl1.png";
import fxExpl2Url from "./game/assets/fx_expl2.png";
import fxExpl3Url from "./game/assets/fx_expl3.png";
import fxHitUrl from "./game/assets/fx_hit.png";
import n0Url from "./game/assets/n0.png";
import n1Url from "./game/assets/n1.png";
import n2Url from "./game/assets/n2.png";
import n3Url from "./game/assets/n3.png";
import n4Url from "./game/assets/n4.png";
import n5Url from "./game/assets/n5.png";
import n6Url from "./game/assets/n6.png";
import n7Url from "./game/assets/n7.png";
import n8Url from "./game/assets/n8.png";
import n9Url from "./game/assets/n9.png";
import "./style.css";

// Pixel-art sheets are loaded asynchronously; characters fall back to a
// coloured box / procedural shape until their sheet is ready.
loadSprite("A", charAUrl);
loadSprite("B", charBUrl);
loadSprite("C", charCUrl);
loadSprite("D", charDUrl);
loadSprite("E", charEUrl);
loadSprite("downB", downBUrl);
loadSprite("downC", downCUrl);
loadSprite("downD", downDUrl);
loadSprite("downE", downEUrl);
loadSprite("fire", fireUrl);
loadSprite("fireBig", fireBigUrl);
loadSprite("bullet", bulletUrl);
loadSprite("bulletMG", bulletMgUrl);
loadSprite("miasmaS", miasmaSUrl);
loadSprite("miasmaL", miasmaLUrl);
loadSprite("lightorb", lightorbUrl);
loadSprite("shuriken", shurikenUrl);
loadSprite("demonB", demonUrl);
loadSprite("summonCircle", summonCircleUrl);
loadSprite("dashE", dashUrl);
loadSprite("shockE", shockUrl);
loadSprite("healBurst", healBurstUrl);
loadSprite("healPillar", healPillarUrl);
loadSprite("hammerPoseE", hammerPoseUrl);
loadSprite("hammerSlamE", hammerSlamUrl);
loadSprite("slashE", slashUrl);
loadSprite("walker", walkerUrl);
loadSprite("shooter", shooterUrl);
loadSprite("flyer", flyerUrl);
loadSprite("brute", bruteUrl);
loadSprite("boss", bossUrl);
loadSprite("miasmaE", miasmaEUrl);
loadSprite("lightningE", lightningEUrl);
loadSprite("stage1_bg", stage1BgUrl);
loadSprite("stage2_bg", stage2BgUrl);
loadSprite("stage3_bg", stage3BgUrl);
loadSprite("stage1_floor", stage1FloorUrl);
loadSprite("stage2_floor", stage2FloorUrl);
loadSprite("stage3_floor", stage3FloorUrl);
loadSprite("item_gold", itemGoldUrl);
loadSprite("item_drink", itemDrinkUrl);
loadSprite("item_w", itemWUrl);
loadSprite("item_s", itemSUrl);
loadSprite("item_heart", itemCrossUrl);
loadSprite("fx_expl0", fxExpl0Url);
loadSprite("fx_expl1", fxExpl1Url);
loadSprite("fx_expl2", fxExpl2Url);
loadSprite("fx_expl3", fxExpl3Url);
loadSprite("fx_hit", fxHitUrl);
loadSprite("n0", n0Url);
loadSprite("n1", n1Url);
loadSprite("n2", n2Url);
loadSprite("n3", n3Url);
loadSprite("n4", n4Url);
loadSprite("n5", n5Url);
loadSprite("n6", n6Url);
loadSprite("n7", n7Url);
loadSprite("n8", n8Url);
loadSprite("n9", n9Url);

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) {
  throw new Error("Canvas element #game was not found in the document.");
}

const TOUCH = "ontouchstart" in window || navigator.maxTouchPoints > 0;

/** Size the canvas to the screen. In portrait on a phone we lay it out
 *  Game-Boy style — the screen pinned to the top with a control deck below;
 *  otherwise it fills the screen preserving the 4:3 aspect ratio. */
function fitCanvas(c: HTMLCanvasElement): void {
  const aspect = c.width / c.height;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const portrait = TOUCH && vh > vw;
  document.body.classList.toggle("portrait", portrait);

  if (portrait) {
    // Screen pinned to the top; the deck fills everything beneath it (so the
    // controls sit at the bottom, under the thumbs). Shrink the screen only if
    // needed to guarantee a usable deck height.
    const topMargin = 8;
    const minDeck = 250;
    let w = vw;
    let h = w / aspect;
    const maxCanvasH = vh - topMargin - minDeck;
    if (h > maxCanvasH) {
      h = maxCanvasH;
      w = h * aspect;
    }
    const deckH = Math.round(vh - h - topMargin);
    document.documentElement.style.setProperty("--deck-h", `${deckH}px`);
    c.style.width = `${Math.round(w)}px`;
    c.style.height = `${Math.round(h)}px`;
    return;
  }

  let w = vw;
  let h = w / aspect;
  if (h > vh) {
    h = vh;
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

const game = new Game(canvas, new OpeningScene());
new TouchControls(game.input);
game.start();
