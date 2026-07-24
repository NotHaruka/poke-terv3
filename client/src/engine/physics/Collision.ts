/** AABB collision detection system */

export interface Collider {
  x: number;
  y: number;
  width: number;
  height: number;
  solid: boolean;
  group: string;
}

export class CollisionSystem {
  items: Collider[] = [];

  add(c: Collider): void {
    this.items.push(c);
  }

  remove(c: Collider): void {
    const i = this.items.indexOf(c);
    if (i >= 0) this.items.splice(i, 1);
  }

  clear(): void {
    this.items.length = 0;
  }

  canMove(x: number, y: number, w: number, h: number, ex?: Collider): boolean {
    for (const c of this.items) {
      if (c === ex || !c.solid) continue;
      if (x < c.x + c.width && x + w > c.x && y < c.y + c.height && y + h > c.y) return false;
    }
    return true;
  }

  tryMove(cx: number, cy: number, tx: number, ty: number, w: number, h: number, ex?: Collider): { x: number; y: number; hit: boolean } {
    if (this.canMove(tx, ty, w, h, ex)) return { x: tx, y: ty, hit: false };

    const xok = this.canMove(tx, cy, w, h, ex);
    const yok = this.canMove(cx, ty, w, h, ex);

    if (xok) return { x: tx, y: cy, hit: true };
    if (yok) return { x: cx, y: ty, hit: true };
    return { x: cx, y: cy, hit: true };
  }
}