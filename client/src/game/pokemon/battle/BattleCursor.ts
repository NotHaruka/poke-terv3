import { AudioManager } from '../../engine/AudioManager.js';

export class BattleCursor {
  private currentX: number = 0;
  private currentY: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  private animTime: number = 0;
  private initialized: boolean = false;

  public setTarget(x: number, y: number, playSound: boolean = true, audioManager: AudioManager | null = null): void {
    if (!this.initialized) {
      this.currentX = x;
      this.currentY = y;
      this.initialized = true;
    }
    
    if ((this.targetX !== x || this.targetY !== y) && playSound && audioManager) {
      audioManager.playSFX('select');
    }

    this.targetX = x;
    this.targetY = y;
  }

  public update(dt: number): void {
    this.animTime += dt / 1000;
    // Smooth lerp (60fps lerp speed ~0.3)
    const lerpFactor = Math.min(1, dt * 0.02);
    this.currentX += (this.targetX - this.currentX) * lerpFactor;
    this.currentY += (this.targetY - this.currentY) * lerpFactor;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.initialized) return;

    ctx.save();
    // Bouncing horizontal offset
    const bounceX = Math.sin(this.animTime * 10) * 2;
    const renderX = Math.round(this.currentX + bounceX);
    const renderY = Math.round(this.currentY);

    // Draw cursor arrow ▶
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Shadow
    ctx.fillStyle = '#101010';
    ctx.fillText('▶', renderX + 1, renderY + 1);

    // Primary cursor color
    ctx.fillStyle = '#e74c3c';
    ctx.fillText('▶', renderX, renderY);

    ctx.restore();
  }
}
