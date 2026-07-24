/** Fixed-timestep game loop with interpolation */

import { TARGET_FPS, FIXED_TIMESTEP } from 'poke-ter-shared';

export class GameLoop {
  private lastTime = 0;
  private accumulator = 0;
  private running = false;
  private rafId = 0;
  private updateFn: (dt: number) => void;
  private renderFn: (alpha: number) => void;

  constructor(
    updateFn: (dt: number) => void,
    renderFn: (alpha: number) => void,
  ) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.tick(this.lastTime);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private tick = (now: number): void => {
    if (!this.running) return;

    const frameTime = Math.min(now - this.lastTime, 50); // Cap at 50ms to prevent spiral
    this.lastTime = now;
    this.accumulator += frameTime;

    // Fixed timestep updates
    while (this.accumulator >= FIXED_TIMESTEP) {
      this.updateFn(FIXED_TIMESTEP);
      this.accumulator -= FIXED_TIMESTEP;
    }

    // Render with interpolation alpha
    const alpha = this.accumulator / FIXED_TIMESTEP;
    this.renderFn(alpha);

    this.rafId = requestAnimationFrame(this.tick);
  };

  isRunning(): boolean {
    return this.running;
  }
}