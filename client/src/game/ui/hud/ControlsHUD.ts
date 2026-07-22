import { GAME_WIDTH, GAME_HEIGHT } from 'poke-ter-shared';

export interface ToastMessage {
  text: string;
  icon?: string;
  timer: number; // seconds remaining
}

export class ControlsHUD {
  private isVisible: boolean = false;
  private activeToast: ToastMessage | null = null;
  private visibilityAlpha: number = 0.0;

  toggleVisibility(): void {
    this.isVisible = !this.isVisible;
  }

  showToast(text: string, icon: string = 'ℹ️', duration = 2.0): void {
    this.activeToast = { text, icon, timer: duration };
  }

  update(dt: number): void {
    if (this.activeToast) {
      this.activeToast.timer -= dt / 1000;
      if (this.activeToast.timer <= 0) {
        this.activeToast = null;
      }
    }

    const target = this.isVisible ? 1.0 : 0.0;
    if (this.visibilityAlpha < target) {
      this.visibilityAlpha = Math.min(target, this.visibilityAlpha + dt * 0.015);
    } else if (this.visibilityAlpha > target) {
      this.visibilityAlpha = Math.max(target, this.visibilityAlpha - dt * 0.015);
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    isRunning: boolean,
    audioVol: number,
    minimapExpanded: boolean
  ): void {
    ctx.save();

    // 1. Toast Notification Rendering (Center Bottom above controls)
    if (this.activeToast) {
      ctx.font = '8px monospace';
      const toastText = `${this.activeToast.icon} ${this.activeToast.text}`;
      const textWidth = ctx.measureText(toastText).width;
      const toastW = Math.min(GAME_WIDTH - 16, textWidth + 16);
      const toastH = 18;
      const toastX = (GAME_WIDTH - toastW) / 2;
      const toastY = GAME_HEIGHT - 38;

      ctx.fillStyle = 'rgba(10, 15, 30, 0.92)';
      ctx.fillRect(toastX, toastY, toastW, toastH);
      ctx.strokeStyle = '#4deeea';
      ctx.lineWidth = 1;
      ctx.strokeRect(toastX, toastY, toastW, toastH);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(toastText, GAME_WIDTH / 2, toastY + toastH / 2);
    }

    // 2. Render small "KEYS" chip if there's any portion of it visible
    if (this.visibilityAlpha < 1.0) {
      ctx.save();
      ctx.globalAlpha = 1.0 - this.visibilityAlpha;
      
      ctx.fillStyle = 'rgba(12, 18, 34, 0.85)';
      ctx.fillRect(4, GAME_HEIGHT - 16, 20, 12);
      ctx.strokeStyle = '#4deeea';
      ctx.strokeRect(4, GAME_HEIGHT - 16, 20, 12);

      ctx.fillStyle = '#ffffff';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('KEYS', 14, GAME_HEIGHT - 10);
      ctx.restore();
    }

    // 3. Render full Control Bar if there's any portion of it visible
    if (this.visibilityAlpha > 0.0) {
      ctx.save();
      ctx.globalAlpha = this.visibilityAlpha;

      const barW = GAME_WIDTH - 8;
      const barH = 15;
      const barX = 4;
      const barY = GAME_HEIGHT - 18;

      // Background panel
      ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.strokeStyle = 'rgba(77, 238, 234, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);

      // Control hint items
      ctx.font = '7px monospace';
      ctx.textBaseline = 'middle';

      const hints = [
        { key: 'WASD', label: 'Move', color: '#aaaaaa' },
        { key: 'SHIFT', label: 'Run', color: isRunning ? '#ff007f' : '#aaaaaa' },
        { key: 'SPACE', label: 'Talk', color: '#4deeea' },
        { key: 'E', label: 'Menu', color: '#ffcc00' },
        { key: 'M', label: 'Map', color: minimapExpanded ? '#4deeea' : '#aaaaaa' },
        { key: 'N', label: audioVol > 0 ? `${Math.round(audioVol * 100)}%` : 'Mute', color: audioVol > 0 ? '#00ff66' : '#ff4444' },
        { key: 'H', label: 'Hide', color: '#888888' },
      ];

      let currentX = barX + 6;
      for (const h of hints) {
        // Key Badge Box
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        const keyW = ctx.measureText(h.key).width + 4;
        ctx.fillRect(currentX, barY + 2, keyW, 11);

        ctx.fillStyle = h.color;
        ctx.textAlign = 'center';
        ctx.fillText(h.key, currentX + keyW / 2, barY + 8);

        currentX += keyW + 2;

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(h.label, currentX, barY + 8);

        currentX += ctx.measureText(h.label).width + 6;
      }

      ctx.restore();
    }

    ctx.restore();
  }

  handleClick(clickX: number, clickY: number): 'M' | 'N' | 'E' | 'H' | 'TOGGLE_SHOW' | null {
    if (!this.isVisible) {
      if (clickX >= 4 && clickX <= 24 && clickY >= GAME_HEIGHT - 16) {
        this.isVisible = true;
        return 'TOGGLE_SHOW';
      }
      return null;
    }

    const barY = GAME_HEIGHT - 18;
    if (clickY >= barY && clickY <= barY + 15) {
      // Determine clicked key region roughly by X
      if (clickX > GAME_WIDTH - 30) {
        this.isVisible = false;
        return 'H';
      }
      if (clickX > GAME_WIDTH - 85 && clickX < GAME_WIDTH - 30) {
        return 'N';
      }
      if (clickX > GAME_WIDTH - 125 && clickX < GAME_WIDTH - 85) {
        return 'M';
      }
      if (clickX > 110 && clickX < 145) {
        return 'E';
      }
    }
    return null;
  }
}
