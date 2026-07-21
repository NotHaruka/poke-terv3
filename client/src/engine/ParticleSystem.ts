interface Part { x: number; y: number; vx: number; vy: number; life: number; max: number; sz: number; col: string; }

export class ParticleSystem {
  private list: Part[] = [];
  emit(x: number, y: number, n: number, cols: string[], spd = 1, spread = 8, life = 20): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * spd;
      this.list.push({ x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.5) * spread, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, sz: 1 + Math.random() * 3, col: cols[Math.floor(Math.random() * cols.length)] });
    }
  }
  update(dt: number): void {
    const s = dt / 16.667;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.life -= s;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.x += p.vx * s; p.y += p.vy * s;
    }
  }
  render(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.8;
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.round(p.x - ox - p.sz / 2), Math.round(p.y - oy - p.sz / 2), Math.max(1, Math.round(p.sz)), Math.max(1, Math.round(p.sz)));
    }
    ctx.globalAlpha = 1;
  }
  clear(): void { this.list.length = 0; }
}
