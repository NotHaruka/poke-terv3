export interface Scene { init?(): void; update(dt: number): void; render(): void; destroy?(): void; }

export class SceneManager {
  private stack: Scene[] = [];
  private pushQ: Scene[] = [];
  private popN = 0;

  push(s: Scene): void { this.pushQ.push(s); }
  pop(n = 1): void { this.popN += n; }
  replace(s: Scene): void { this.pop(1); this.push(s); }
  top(): Scene | null { return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null; }
  update(dt: number): void { this.flush(); this.top()?.update(dt); }
  render(): void { this.top()?.render(); }
  clear(): void { while (this.stack.length) this.stack.pop()?.destroy?.(); this.pushQ.length = 0; this.popN = 0; }
  private flush(): void {
    while (this.popN > 0 && this.stack.length) { this.stack.pop()?.destroy?.(); this.popN--; }
    while (this.pushQ.length) { const s = this.pushQ.shift()!; this.stack.push(s); s.init?.(); }
  }
}
