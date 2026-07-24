import { Menu, BaseMenu } from './Menu.js';
import { GAME_WIDTH, GAME_HEIGHT } from 'poke-ter-shared';

export class MainMenu extends Menu {
  private options: string[] = ['Backpack', 'Monster Party', 'Data Log', 'Player Card', 'Save', 'Settings', 'Exit'];
  private selectedIndex: number = 0;
  private onSelect: (option: string) => void;

  constructor(onSelect: (option: string) => void) {
    super();
    this.onSelect = onSelect;
  }

  onKeyDown(key: string): void {
    if (this.targetAlpha < 1) return; // Prevent input while closing/opening

    if (key === 'ArrowUp' || key === 'KeyW') {
      this.selectedIndex--;
      if (this.selectedIndex < 0) this.selectedIndex = this.options.length - 1;
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'ArrowDown' || key === 'KeyS') {
      this.selectedIndex++;
      if (this.selectedIndex >= this.options.length) this.selectedIndex = 0;
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'Enter' || key === 'Space') {
      if (this.audioManager) this.audioManager.playSFX('bump');
      this.onSelect(this.options[this.selectedIndex]);
      if (this.options[this.selectedIndex] === 'Exit') {
        this.close();
      }
    } else if (key === 'Escape' || key === 'KeyE') {
      if (this.audioManager) this.audioManager.playSFX('cancel');
      this.close();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const width = 100;
    const itemHeight = 16;
    const padding = 8;
    const height = this.options.length * itemHeight + padding * 2;
    const x = GAME_WIDTH - width - 8;
    const y = 8;

    this.drawWindow(ctx, x, y, width, height);

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.font = '10px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    for (let i = 0; i < this.options.length; i++) {
      const optY = y + padding + i * itemHeight + itemHeight / 2;
      
      if (i === this.selectedIndex) {
        ctx.fillStyle = '#4deeea'; // Cyan cursor
        // Draw a small arrow cursor
        ctx.beginPath();
        ctx.moveTo(x + 10, optY - 4);
        ctx.lineTo(x + 14, optY);
        ctx.lineTo(x + 10, optY + 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff'; // Selected text color
      } else {
        ctx.fillStyle = '#8ab4f8'; // Unselected text color
      }

      ctx.fillText(this.options[i], x + 20, optY);
    }
    ctx.restore();
  }
}
