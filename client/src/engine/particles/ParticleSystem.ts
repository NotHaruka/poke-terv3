export type PartType = 'rect' | 'leaf' | 'bird' | 'dust' | 'sparkle';
interface Part { x: number; y: number; vx: number; vy: number; life: number; max: number; sz: number; col: string; type: PartType; }
export class ParticleSystem {
  private list: Part[] = [];
  emit(x: number, y: number, n: number, cols: string[], spd = 1, spread = 8, life = 20, type: PartType = 'rect'): void {
    for (let i = 0; i < n; i++) {
      const a = type === 'bird' ? (Math.random() < 0.5 ? 0 : Math.PI) : Math.random() * Math.PI * 2;
      const s = type === 'bird' ? spd + Math.random() : Math.random() * spd;
      this.list.push({ x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.5) * spread, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, sz: 1 + Math.random() * 3, col: cols[Math.floor(Math.random() * cols.length)], type });
    }
  }
  update(dt: number): void {
    const s = dt / 16.667;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i]; p.life -= s;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.x += p.vx * s; p.y += p.vy * s;
      if (p.type === 'leaf') {
         p.vx = Math.sin(p.life * 0.1) * 0.5;
         p.vy = 0.5;
      }
    }
  }
  render(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.8;
      ctx.fillStyle = p.col;
      const px = Math.round(p.x - ox - p.sz / 2);
      const py = Math.round(p.y - oy - p.sz / 2);
      if (p.type === 'bird') {
          const wing = Math.sin(p.life * 0.5) * 2;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px - 2, py - wing);
          ctx.lineTo(px + 2, py - wing);
          ctx.fill();
      } else if (p.type === 'sparkle') {
          const s = Math.max(1, Math.round(p.sz)) + Math.sin(p.life * 0.4) * 1; // twinkle
          ctx.fillRect(px + s / 2 - 0.5, py - s / 2, 1, s * 2); // vertical spoke
          ctx.fillRect(px - s / 2, py + s / 2 - 0.5, s * 2, 1); // horizontal spoke
      } else {
          ctx.fillRect(px, py, Math.max(1, Math.round(p.sz)), Math.max(1, Math.round(p.sz)));
      }
    }
    ctx.globalAlpha = 1;
  }
  clear(): void { this.list.length = 0; }
}