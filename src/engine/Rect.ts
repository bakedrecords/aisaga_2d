/** An axis-aligned bounding box, used for collision tests. */
export class Rect {
  constructor(
    public x: number,
    public y: number,
    public w: number,
    public h: number,
  ) {}

  get right(): number {
    return this.x + this.w;
  }

  get bottom(): number {
    return this.y + this.h;
  }

  get centerX(): number {
    return this.x + this.w / 2;
  }

  get centerY(): number {
    return this.y + this.h / 2;
  }

  intersects(o: Rect): boolean {
    return (
      this.x < o.right && this.right > o.x && this.y < o.bottom && this.bottom > o.y
    );
  }
}
