/**
 * Supply Mart Shop Menu UI
 * Active shopkeeper cashier interface for purchasing Capture Pods, Potions, and supplies.
 */

import { Menu } from './Menu.js';
import { GAME_WIDTH, GAME_HEIGHT } from 'poke-ter-shared';
import { Player } from '../../entities/Player.js';

export interface ShopItem {
  id: number;
  name: string;
  price: number;
  description: string;
  category: string;
}

export const MART_ITEMS: ShopItem[] = [
  { id: 1, name: 'Capture Pod', price: 200, description: 'Standard device used to capture wild monsters.', category: 'Pod' },
  { id: 2, name: 'Great Pod', price: 600, description: 'High-performance Capture Pod with higher catch rate.', category: 'Pod' },
  { id: 3, name: 'Potion', price: 300, description: 'Restores 20 HP to a wounded monster.', category: 'Medicine' },
  { id: 4, name: 'Hyper Potion', price: 800, description: 'Restores 50 HP to a wounded monster.', category: 'Medicine' },
  { id: 5, name: 'Antidote', price: 100, description: 'Cures poison and status ailments.', category: 'Medicine' },
  { id: 6, name: 'Repel', price: 350, description: 'Wards off wild monster encounters for 250 steps.', category: 'Supply' },
];

export class SupplyMartMenu extends Menu {
  private player: Player;
  private selectedIndex: number = 0;
  private buyQuantity: number = 1;
  private messageToast: string = '';
  private toastTimer: number = 0;

  constructor(player: Player) {
    super();
    this.player = player;
  }

  update(dt: number): void {
    super.update(dt);
    if (this.toastTimer > 0) {
      this.toastTimer -= dt / 1000;
      if (this.toastTimer <= 0) this.messageToast = '';
    }
  }

  onKeyDown(key: string): void {
    if (this.targetAlpha < 1) return;

    if (key === 'ArrowUp' || key === 'KeyW') {
      this.selectedIndex--;
      if (this.selectedIndex < 0) this.selectedIndex = MART_ITEMS.length - 1;
      this.buyQuantity = 1;
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'ArrowDown' || key === 'KeyS') {
      this.selectedIndex++;
      if (this.selectedIndex >= MART_ITEMS.length) this.selectedIndex = 0;
      this.buyQuantity = 1;
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'ArrowLeft' || key === 'KeyA') {
      this.buyQuantity = Math.max(1, this.buyQuantity - 1);
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'ArrowRight' || key === 'KeyD') {
      this.buyQuantity = Math.min(10, this.buyQuantity + 1);
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'Enter' || key === 'Space') {
      this.buySelectedItem();
    } else if (key === 'Escape' || key === 'KeyE') {
      if (this.audioManager) this.audioManager.playSFX('cancel');
      this.close();
    }
  }

  private buySelectedItem(): void {
    const item = MART_ITEMS[this.selectedIndex];
    const totalCost = item.price * this.buyQuantity;

    if (this.player.money < totalCost) {
      if (this.audioManager) this.audioManager.playSFX('cancel');
      this.messageToast = 'Not enough money!';
      this.toastTimer = 2.0;
      return;
    }

    // Deduct money
    this.player.money -= totalCost;

    // Add to inventory
    const existing = this.player.inventory.find(inv => inv.itemId === item.id);
    if (existing) {
      existing.quantity += this.buyQuantity;
    } else {
      this.player.inventory.push({ itemId: item.id, quantity: this.buyQuantity });
    }

    if (this.audioManager) this.audioManager.playSFX('open');
    this.messageToast = `Purchased ${this.buyQuantity}x ${item.name}!`;
    this.toastTimer = 2.0;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const w = 260;
    const h = 180;
    const x = (GAME_WIDTH - w) / 2;
    const y = (GAME_HEIGHT - h) / 2;

    this.drawWindow(ctx, x, y, w, h);

    ctx.save();
    ctx.globalAlpha = this.alpha;

    // Title
    ctx.fillStyle = '#00ff66';
    ctx.fillRect(x + 10, y + 8, w - 20, 16);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('SUPPLY MART SHOP', x + 16, y + 16);

    // Money display
    ctx.fillStyle = '#f1c40f';
    ctx.textAlign = 'right';
    ctx.fillText(`COINS: $${this.player.money}`, x + w - 16, y + 16);
    ctx.textAlign = 'left';

    // Item List
    for (let i = 0; i < MART_ITEMS.length; i++) {
      const itemY = y + 30 + i * 18;
      const item = MART_ITEMS[i];
      const isSelected = i === this.selectedIndex;

      if (isSelected) {
        ctx.fillStyle = 'rgba(0, 255, 102, 0.2)';
        ctx.fillRect(x + 10, itemY - 2, w - 20, 16);
        ctx.strokeStyle = '#00ff66';
        ctx.strokeRect(x + 10, itemY - 2, w - 20, 16);
      }

      ctx.fillStyle = isSelected ? '#ffffff' : '#aaaaaa';
      ctx.font = '8px monospace';
      ctx.fillText(`${isSelected ? '▶ ' : '  '}${item.name}`, x + 14, itemY + 6);

      ctx.fillStyle = '#f1c40f';
      ctx.textAlign = 'right';
      ctx.fillText(`$${item.price}`, x + w - 20, itemY + 6);
      ctx.textAlign = 'left';
    }

    // Selected Item Description & Purchase Controls
    if (this.messageToast) {
      ctx.fillStyle = 'rgba(231, 76, 60, 0.95)';
      ctx.fillRect(x + 10, y + 142, w - 20, 32);
      ctx.strokeStyle = '#ffcc00';
      ctx.strokeRect(x + 10, y + 142, w - 20, 32);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.messageToast, x + w / 2, y + 158);
      ctx.textAlign = 'left';
    } else {
      const selectedItem = MART_ITEMS[this.selectedIndex];
      const totalCost = selectedItem.price * this.buyQuantity;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(x + 10, y + 142, w - 20, 32);
      ctx.strokeStyle = '#00ff66';
      ctx.strokeRect(x + 10, y + 142, w - 20, 32);

      ctx.fillStyle = '#ffffff';
      ctx.font = '7.5px monospace';
      ctx.textBaseline = 'top';
      const maxW = w - 28;
      const words = selectedItem.description.split(' ');
      let line1 = '';
      let line2 = '';
      for (const word of words) {
        if (ctx.measureText(line1 ? `${line1} ${word}` : word).width < maxW) {
          line1 = line1 ? `${line1} ${word}` : word;
        } else {
          line2 = line2 ? `${line2} ${word}` : word;
        }
      }
      ctx.fillText(line1, x + 14, y + 146);
      if (line2) {
        ctx.fillText(line2, x + 14, y + 154);
        ctx.fillStyle = '#4deeea';
        ctx.fillText(`Qty: < ${this.buyQuantity} > | Total: $${totalCost} | [ENTER] Buy`, x + 14, y + 162);
      } else {
        ctx.fillStyle = '#4deeea';
        ctx.fillText(`Qty: < ${this.buyQuantity} > | Total: $${totalCost} | [ENTER] Buy`, x + 14, y + 158);
      }
    }

    ctx.restore();
  }
}
