import { GAME_WIDTH, GAME_HEIGHT } from 'poke-ter-shared';
import { AudioManager } from '../../../engine/AudioManager.js';

export interface BaseMenu {
  init(audioManager: AudioManager | null): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  onKeyDown(key: string): void;
  close(): void;
  isClosed(): boolean;
}

export abstract class Menu implements BaseMenu {
  protected closed = false;
  protected alpha = 0;
  protected targetAlpha = 1;
  protected audioManager: AudioManager | null = null;

  init(audioManager: AudioManager | null = null): void {
    this.audioManager = audioManager;
    this.closed = false;
    this.alpha = 0;
    this.targetAlpha = 1;
  }

  update(dt: number): void {
    if (this.alpha < this.targetAlpha) {
      this.alpha = Math.min(this.targetAlpha, this.alpha + dt * 0.015);
    } else if (this.alpha > this.targetAlpha) {
      this.alpha = Math.max(this.targetAlpha, this.alpha - dt * 0.015);
      if (this.alpha === 0 && this.targetAlpha === 0) {
        this.closed = true;
      }
    }
  }

  abstract render(ctx: CanvasRenderingContext2D): void;
  abstract onKeyDown(key: string): void;

  close(): void {
    this.targetAlpha = 0;
  }

  isClosed(): boolean {
    return this.closed;
  }

  protected drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    
    // Sleek dark translucent background
    ctx.fillStyle = 'rgba(15, 20, 35, 0.85)';
    ctx.fillRect(x, y, w, h);
    
    // Thin bright inner border
    ctx.strokeStyle = '#4deeea';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    
    // Outer shadow/border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    
    ctx.restore();
  }
}
