export interface AnimFrame { sx: number; sy: number; }
export interface AnimDef { name: string; frames: AnimFrame[]; loop: boolean; }

export class AnimPlayer {
  private map = new Map<string, AnimDef>();
  cur: string | null = null;
  idx = 0; private timer = 0; done = false;

  register(d: AnimDef): void { this.map.set(d.name, d); }
  play(n: string): void { if (this.cur === n) return; const d = this.map.get(n); if (!d) return; this.cur = n; this.idx = 0; this.timer = 0; this.done = false; }
  update(dt: number): void {
    if (this.done || !this.cur) return;
    this.timer += dt;
    if (this.timer >= 16.667) { this.timer -= 16.667; this.idx++; }
    const d = this.map.get(this.cur); if (!d) return;
    if (this.idx >= d.frames.length) { if (d.loop) this.idx = 0; else { this.idx = d.frames.length - 1; this.done = true; } }
  }
  frame(): AnimFrame | null { if (!this.cur) return null; const d = this.map.get(this.cur); return d ? d.frames[this.idx] ?? null : null; }
}

export function walkAnim(n: string, row: number, ts = 16): AnimDef {
  const f: AnimFrame[] = [];
  for (let i = 0; i < 4; i++) f.push({ sx: i * ts, sy: row * ts });
  return { name: n, frames: f, loop: true };
}
export function idleAnim(n: string, row: number, ts = 16): AnimDef {
  return { name: n, frames: [{ sx: 0, sy: row * ts }], loop: true };
}
