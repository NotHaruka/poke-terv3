/**
 * TransitionManager handles screen fade transitions (fade out to black, hold, fade back in)
 * and movement locking during map transitions.
 */

export class TransitionManager {
  private alpha: number = 0; // 0 = transparent, 1 = solid black
  private state: 'idle' | 'fading_out' | 'fading_in' = 'idle';
  private fadeSpeed: number = 3.0; // speed of fade
  private onMidpointCallback: (() => void) | null = null;
  private onCompleteCallback: (() => void) | null = null;

  public startTransition(
    onMidpoint: () => void,
    onComplete?: () => void,
    fadeSpeed = 3.0
  ): void {
    if (this.state !== 'idle') return;
    this.fadeSpeed = fadeSpeed;
    this.onMidpointCallback = onMidpoint;
    this.onCompleteCallback = onComplete || null;
    this.state = 'fading_out';
  }

  public isTransitioning(): boolean {
    return this.state !== 'idle';
  }

  public update(dt: number): void {
    if (this.state === 'idle') return;

    if (this.state === 'fading_out') {
      this.alpha += this.fadeSpeed * dt;
      if (this.alpha >= 1.0) {
        this.alpha = 1.0;
        this.state = 'fading_in';

        // Execute midpoint callback (swapping map/position)
        if (this.onMidpointCallback) {
          this.onMidpointCallback();
          this.onMidpointCallback = null;
        }
      }
    } else if (this.state === 'fading_in') {
      this.alpha -= this.fadeSpeed * dt;
      if (this.alpha <= 0.0) {
        this.alpha = 0.0;
        this.state = 'idle';

        if (this.onCompleteCallback) {
          this.onCompleteCallback();
          this.onCompleteCallback = null;
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.alpha <= 0) return;

    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1.0, Math.max(0.0, this.alpha))})`;
    ctx.fillRect(0, 0, 320, 240);
  }
}
