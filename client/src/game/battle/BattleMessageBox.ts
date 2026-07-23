import { AudioManager } from '../../engine/AudioManager.js';

export class BattleMessageBox {
  private fullText: string = '';
  private displayedText: string = '';
  private charIndex: number = 0;
  private charTimer: number = 0;
  private speedMs: number = 22; // ms per char
  private isFinished: boolean = true;
  private animTime: number = 0;
  private audioManager: AudioManager | null = null;
  private tickCounter: number = 0;

  constructor(audioManager: AudioManager | null = null) {
    this.audioManager = audioManager;
  }

  public setText(text: string, speedMs: number = 22): void {
    this.fullText = text;
    this.displayedText = '';
    this.charIndex = 0;
    this.charTimer = 0;
    this.speedMs = speedMs;
    this.isFinished = text.length === 0;
  }

  public isComplete(): boolean {
    return this.isFinished;
  }

  public completeInstantly(): void {
    this.displayedText = this.fullText;
    this.charIndex = this.fullText.length;
    this.isFinished = true;
  }

  public update(dt: number): void {
    this.animTime += dt / 1000;
    if (this.isFinished) return;

    this.charTimer += dt;
    while (this.charTimer >= this.speedMs && !this.isFinished) {
      this.charTimer -= this.speedMs;
      this.charIndex++;
      this.displayedText = this.fullText.slice(0, this.charIndex);

      this.tickCounter++;
      if (this.tickCounter % 3 === 0 && this.audioManager) {
        this.audioManager.playSound('select', 0.2);
      }

      if (this.charIndex >= this.fullText.length) {
        this.isFinished = true;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    ctx.save();

    // Box outer border & fill (FireRed style dark-navy blue with double frame)
    ctx.fillStyle = '#182838';
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = '#f8f8f8';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);

    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 5, y + 5, width - 10, height - 10);

    // Text rendering
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Word wrapping or multi-line splitting
    const lines = this.getWrappedLines(ctx, this.displayedText, width - 24);
    for (let i = 0; i < Math.min(2, lines.length); i++) {
      ctx.fillText(lines[i], x + 12, y + 12 + i * 14);
    }

    // Blinking continuation arrow 🔻
    if (this.isFinished && this.fullText.length > 0) {
      const blink = Math.floor(this.animTime * 4) % 2 === 0;
      if (blink) {
        ctx.fillStyle = '#f1c40f';
        ctx.fillText('▼', x + width - 16, y + height - 14);
      }
    }

    ctx.restore();
  }

  private getWrappedLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine.length === 0 ? word : currentLine + ' ' + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    return lines;
  }
}
