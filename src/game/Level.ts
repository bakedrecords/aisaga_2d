import { Rect } from "../engine/Rect";
import type { StageDef, StageTheme } from "./stages";

/** Static geometry for one stage, built from its data definition. */
export class Level {
  readonly width: number;
  readonly groundY: number;
  readonly goalX: number;
  readonly solids: Rect[];
  readonly theme: StageTheme;
  readonly isBossStage: boolean;

  constructor(def: StageDef, viewHeight: number) {
    this.width = def.width;
    this.groundY = viewHeight - 64;
    this.goalX = def.width - 120;
    this.theme = def.theme;
    this.isBossStage = def.boss ?? false;

    this.solids = [new Rect(0, this.groundY, def.width, 64)];
    for (const p of def.platforms) {
      this.solids.push(new Rect(p.x, this.groundY - p.aboveGround, p.w, 24));
    }
  }
}
