import { AudioManager } from '../../engine/AudioManager.js';

export type BattleTransitionType = 'pvp' | 'wild' | 'gym' | 'boss';

export class BattleTransitionManager {
  private active: boolean = false;
  private type: BattleTransitionType = 'pvp';
  private durationMs: number = 600;
  private elapsedMs: number = 0;
  private onMidpoint?: () => void;
  private onComplete?: () => void;
  private midpointTriggered: boolean = false;
  private audioManager: AudioManager | null = null;

  constructor(audioManager: AudioManager | null = null) {
    this.audioManager = audioManager;
  }

  public isTransitioning(): boolean {
    return this.active;
  }

  public startTransition(
    type: BattleTransitionType = 'pvp',
    durationMs: number = 600,
    onMidpoint?: () => void,
    onComplete?: () => void
  ): void {
    this.active = true;
    this.type = type;
    this.durationMs = durationMs;
    this.elapsedMs = 0;
    this.onMidpoint = onMidpoint;
    this.onComplete = onComplete;
    this.midpointTriggered = false;

    if (this.audioManager) {
      this.audioManager.playSound('open');
    }
  }

  public update(dt: number): void {
    if (!this.active) return;

    this.elapsedMs += dt;
    const progress = Math.min(1, this.elapsedMs / this.durationMs);

    // Midpoint trigger at 50%
    if (progress >= 0.5 && !this.midpointTriggered) {
      this.midpointTriggered = true;
      if (this.onMidpoint) {
        this.onMidpoint();
      }
    }

    if (progress >= 1.0) {
      this.active = false;
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.active) return;

    const progress = Math.min(1, this.elapsedMs / this.durationMs);
    ctx.save();

    if (this.type === 'pvp') {
      this.renderPvPTransition(ctx, width, height, progress);
    } else if (this.type === 'wild') {
      this.renderWildTransition(ctx, width, height, progress);
    } else {
      this.renderPvPTransition(ctx, width, height, progress);
    }

    ctx.restore();
  }

  private renderPvPTransition(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number): void {
    // Stage 1 (0 to 0.3): Flashes
    if (progress < 0.3) {
      const flash = Math.floor(progress * 20) % 2 === 0;
      if (flash) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillRect(0, 0, width, height);
      }
      return;
    }

    // Stage 2 (0.3 to 0.7): Sliding horizontal pixel panels
    if (progress < 0.7) {
      const sub = (progress - 0.3) / 0.4;
      const bandCount = 10;
      const bandHeight = height / bandCount;

      for (let i = 0; i < bandCount; i++) {
        const direction = i % 2 === 0 ? 1 : -1;
        const currentW = Math.min(width, width * sub * 1.5);
        ctx.fillStyle = i % 2 === 0 ? '#101820' : '#2c3e50';

        if (direction === 1) {
          ctx.fillRect(0, i * bandHeight, currentW, bandHeight);
        } else {
          ctx.fillRect(width - currentW, i * bandHeight, currentW, bandHeight);
        }
      }
      return;
    }

    // Stage 3 (0.7 to 1.0): Full dark overlay fading to clean scene start
    const fadeOut = (progress - 0.7) / 0.3;
    ctx.fillStyle = `rgba(0, 0, 0, ${1.0 - fadeOut * 0.5})`;
    ctx.fillRect(0, 0, width, height);
  }

  private renderWildTransition(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number): void {
    if (progress < 0.2) {
      const flash = Math.floor(progress * 20) % 2 === 0;
      if (flash) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);
      }
      return;
    }

    const sub = (progress - 0.2) / 0.8;
    const radius = Math.max(0, (1 - sub) * (Math.max(width, height) * 0.8));

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2, true);
    ctx.fill();
  }
}
