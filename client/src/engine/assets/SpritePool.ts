/** Sprite pooling to minimize canvas allocations and GC pressure */

export interface PooledCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  inUse: boolean;
}

export class SpritePool {
  private static pool: PooledCanvas[] = [];

  static acquire(width = 32, height = 32): PooledCanvas {
    for (const item of this.pool) {
      if (!item.inUse && item.canvas.width === width && item.canvas.height === height) {
        item.inUse = true;
        item.ctx.clearRect(0, 0, width, height);
        return item;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const newItem: PooledCanvas = { canvas, ctx, inUse: true };
    this.pool.push(newItem);
    return newItem;
  }

  static release(item: PooledCanvas): void {
    item.inUse = false;
  }

  static clear(): void {
    this.pool = [];
  }
}
