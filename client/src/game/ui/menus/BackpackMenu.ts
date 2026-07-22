import { Menu } from './Menu.js';
import { GAME_WIDTH, GAME_HEIGHT } from 'poke-ter-shared';
import { Player } from '../../entities/Player.js';

export interface ItemData {
  id: string;
  name: string;
  desc: string;
  qty: number;
  useEffect?: (player: Player) => string | null;
}

export class BackpackMenu extends Menu {
  private categories: string[] = ['Items', 'Key Items', 'Capture Pods', 'Berries', 'Materials'];
  private selectedCategory: number = 0;
  private selectedItem: number = 0;
  private player?: Player;
  private statusMessage: string | null = null;
  private statusTimer: number = 0;

  // Initialized inventory data
  private inventory: Record<string, ItemData[]> = {
    'Items': [
      {
        id: 'potion',
        name: 'Potion',
        desc: 'Restores 20 HP to a injured monster in party.',
        qty: 5,
        useEffect: (p) => {
          if (p.party && p.party.length > 0) {
            const first = p.party[0];
            first.currentHp = Math.min(first.maxHp, first.currentHp + 20);
            return `Used Potion on ${first.nickname || first.species}! HP restored.`;
          }
          return 'Used Potion! Party fully energized.';
        }
      },
      {
        id: 'super_potion',
        name: 'Super Potion',
        desc: 'Restores 50 HP to a monster.',
        qty: 2,
        useEffect: (p) => {
          if (p.party && p.party.length > 0) {
            const first = p.party[0];
            first.currentHp = Math.min(first.maxHp, first.currentHp + 50);
            return `Used Super Potion on ${first.nickname || first.species}!`;
          }
          return 'Used Super Potion!';
        }
      },
      {
        id: 'repel',
        name: 'Super Repel',
        desc: 'Prevents weak wild encounters for 200 steps.',
        qty: 3,
        useEffect: () => 'Activated Super Repel spray!'
      }
    ],
    'Key Items': [
      {
        id: 'running_shoes',
        name: 'Running Shoes',
        desc: 'Hold SHIFT while walking to sprint at high speeds.',
        qty: 1
      },
      {
        id: 'radar_map',
        name: 'Town Radar Map',
        desc: 'Press M key anytime to toggle spatial minimap view.',
        qty: 1
      }
    ],
    'Capture Pods': [
      {
        id: 'standard_pod',
        name: 'Standard Pod',
        desc: 'A device for catching wild monsters.',
        qty: 10
      },
      {
        id: 'great_pod',
        name: 'Great Pod',
        desc: 'A high-performance capsule with a higher catch rate.',
        qty: 3
      }
    ],
    'Berries': [
      {
        id: 'oran_berry',
        name: 'Oran Berry',
        desc: 'A peculiar berry that restores 10 HP.',
        qty: 4,
        useEffect: (p) => {
          if (p.party && p.party.length > 0) {
            const first = p.party[0];
            first.currentHp = Math.min(first.maxHp, first.currentHp + 10);
            return `Fed Oran Berry to ${first.nickname || first.species}!`;
          }
          return 'Ate Oran Berry!';
        }
      }
    ],
    'Materials': [
      {
        id: 'stardust',
        name: 'Stardust',
        desc: 'Lovely red sand that glows like stars. High resale value.',
        qty: 2
      }
    ]
  };

  constructor(player?: Player) {
    super();
    this.player = player;
  }

  update(dt: number): void {
    super.update(dt);
    if (this.statusTimer > 0) {
      this.statusTimer -= dt;
      if (this.statusTimer <= 0) {
        this.statusMessage = null;
      }
    }
  }

  onKeyDown(key: string): void {
    if (this.targetAlpha < 1) return;

    const currentItems = this.inventory[this.categories[this.selectedCategory]] || [];

    if (key === 'ArrowLeft' || key === 'KeyA') {
      this.selectedCategory = (this.selectedCategory - 1 + this.categories.length) % this.categories.length;
      this.selectedItem = 0;
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'ArrowRight' || key === 'KeyD') {
      this.selectedCategory = (this.selectedCategory + 1) % this.categories.length;
      this.selectedItem = 0;
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'ArrowUp' || key === 'KeyW') {
      this.selectedItem--;
      if (this.selectedItem < 0) this.selectedItem = Math.max(0, currentItems.length - 1);
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'ArrowDown' || key === 'KeyS') {
      this.selectedItem++;
      if (this.selectedItem >= currentItems.length) this.selectedItem = 0;
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'Enter' || key === 'Space') {
      const item = currentItems[this.selectedItem];
      if (item && item.qty > 0 && item.useEffect && this.player) {
        const msg = item.useEffect(this.player);
        if (msg) {
          this.statusMessage = msg;
          this.statusTimer = 2.5;
          if (item.qty > 1) {
            item.qty--;
          }
          if (this.audioManager) this.audioManager.playSound('fanfare');
        }
      } else {
        if (this.audioManager) this.audioManager.playSFX('bump');
      }
    } else if (key === 'Escape' || key === 'KeyE') {
      if (this.audioManager) this.audioManager.playSFX('cancel');
      this.close();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const margin = 12;
    const w = GAME_WIDTH - margin * 2;
    const h = GAME_HEIGHT - margin * 2;
    this.drawWindow(ctx, margin, margin, w, h);

    ctx.save();
    ctx.globalAlpha = this.alpha;
    
    // Draw Category Tabs
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const tabW = w / this.categories.length;
    for (let i = 0; i < this.categories.length; i++) {
      const tabX = margin + i * tabW;
      if (i === this.selectedCategory) {
        ctx.fillStyle = '#4deeea';
        ctx.fillRect(tabX + 1, margin + 2, tabW - 2, 16);
        ctx.fillStyle = '#0f1423';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(tabX + 1, margin + 2, tabW - 2, 16);
        ctx.fillStyle = '#8ab4f8';
      }
      const label = this.categories[i].length > 8 ? this.categories[i].substring(0, 6) + '..' : this.categories[i];
      ctx.fillText(label, tabX + tabW / 2, margin + 10);
    }

    // Draw Items
    const items = this.inventory[this.categories[this.selectedCategory]] || [];
    const itemStartY = margin + 24;
    
    ctx.textAlign = 'left';
    ctx.font = '8px monospace';

    if (items.length === 0) {
      ctx.fillStyle = '#8ab4f8';
      ctx.fillText('No items in this pocket.', margin + 16, itemStartY + 10);
    } else {
      for (let i = 0; i < items.length; i++) {
        const y = itemStartY + i * 16;
        
        if (i === this.selectedItem) {
          ctx.fillStyle = 'rgba(77, 238, 234, 0.2)';
          ctx.fillRect(margin + 4, y, w - 8, 14);
          ctx.fillStyle = '#4deeea';
          ctx.fillText('▶', margin + 8, y + 7);
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = '#8ab4f8';
        }
        
        ctx.fillText(items[i].name, margin + 20, y + 7);
        ctx.textAlign = 'right';
        ctx.fillText(`x${items[i].qty}`, margin + w - 12, y + 7);
        ctx.textAlign = 'left';
      }
      
      // Draw Description Box / Status Box
      const descY = margin + h - 34;
      this.drawWindow(ctx, margin + 4, descY, w - 8, 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = '7px monospace';
      
      if (this.statusMessage) {
        ctx.fillStyle = '#4deeea';
        ctx.fillText(this.statusMessage, margin + 10, descY + 15);
      } else {
        const currentItem = items[this.selectedItem];
        if (currentItem) {
          const maxW = w - 28;
          const words = currentItem.desc.split(' ');
          let line1 = '';
          let line2 = '';
          for (const word of words) {
            if (ctx.measureText(line1 ? `${line1} ${word}` : word).width < maxW) {
              line1 = line1 ? `${line1} ${word}` : word;
            } else {
              line2 = line2 ? `${line2} ${word}` : word;
            }
          }
          ctx.fillText(line1, margin + 10, descY + 10);
          if (line2) {
            ctx.fillText(line2, margin + 10, descY + 18);
          } else if (currentItem.useEffect) {
            ctx.fillStyle = '#ffcc00';
            ctx.fillText('[ENTER] Use Item', margin + 10, descY + 20);
          }
        }
      }
    }
    
    ctx.restore();
  }
}
