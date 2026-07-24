import { Menu } from './Menu.js';
import { GAME_WIDTH, GAME_HEIGHT } from 'poke-ter-shared';

export class PlayerInteractionMenu extends Menu {
  private targetName: string;
  private options: string[] = ['Challenge to Battle', 'Trade', 'View Trainer', 'Cancel'];
  private selectedIndex: number = 0;
  private onSelectOption: (option: string) => void;

  constructor(targetName: string, onSelectOption: (option: string) => void) {
    super();
    this.targetName = targetName;
    this.onSelectOption = onSelectOption;
  }

  onKeyDown(key: string): void {
    if (this.targetAlpha < 1) return;

    if (key === 'ArrowUp' || key === 'KeyW') {
      this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'ArrowDown' || key === 'KeyS') {
      this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'Enter' || key === 'Space') {
      if (this.audioManager) this.audioManager.playSFX('bump');
      const chosen = this.options[this.selectedIndex];
      this.close();
      this.onSelectOption(chosen);
    } else if (key === 'Escape') {
      if (this.audioManager) this.audioManager.playSFX('cancel');
      this.close();
      this.onSelectOption('Cancel');
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const width = 140;
    const height = 64;
    const x = (GAME_WIDTH - width) / 2;
    const y = (GAME_HEIGHT - height) / 2;

    this.drawWindow(ctx, x, y, width, height);

    ctx.save();
    ctx.globalAlpha = this.alpha;
    
    // Header text
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#4deeea';
    ctx.textAlign = 'center';
    ctx.fillText(this.targetName, x + width / 2, y + 14);

    // Options
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';

    for (let i = 0; i < this.options.length; i++) {
      const optY = y + 28 + i * 14;
      if (i === this.selectedIndex) {
        ctx.fillStyle = '#f1c40f';
        ctx.fillText('▶ ' + this.options[i], x + 12, optY);
      } else {
        ctx.fillStyle = '#ecf0f1';
        ctx.fillText('  ' + this.options[i], x + 12, optY);
      }
    }

    ctx.restore();
  }
}
