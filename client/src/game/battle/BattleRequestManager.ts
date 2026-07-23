import { AudioManager } from '../../engine/AudioManager.js';
import { BattleCursor } from './BattleCursor.js';

export interface PendingRequest {
  id: string;
  fromPlayerId: string;
  fromPlayerName: string;
  timeoutMs: number;
  remainingMs: number;
}

export class BattleRequestManager {
  private incomingRequest: PendingRequest | null = null;
  private outgoingRequest: { targetPlayerId: string; targetPlayerName: string; remainingMs: number } | null = null;
  private selectedOption: number = 0; // 0 = Accept, 1 = Decline
  private cursor: BattleCursor = new BattleCursor();
  private audioManager: AudioManager | null = null;

  // Slide animation properties
  private slideAnimProgress: number = 0; // 0 (hidden) to 1 (fully visible)
  private isClosing: boolean = false;

  // Callbacks
  private onAcceptCallback?: (req: PendingRequest) => void;
  private onDeclineCallback?: (req: PendingRequest) => void;

  constructor(audioManager: AudioManager | null = null) {
    this.audioManager = audioManager;
  }

  public setCallbacks(
    onAccept: (req: PendingRequest) => void,
    onDecline: (req: PendingRequest) => void
  ): void {
    this.onAcceptCallback = onAccept;
    this.onDeclineCallback = onDecline;
  }

  public hasIncomingRequest(): boolean {
    return this.incomingRequest !== null;
  }

  public hasOutgoingRequest(): boolean {
    return this.outgoingRequest !== null;
  }

  public receiveRequest(id: string, fromPlayerId: string, fromPlayerName: string, timeoutSec: number = 15): void {
    this.incomingRequest = {
      id,
      fromPlayerId,
      fromPlayerName,
      timeoutMs: timeoutSec * 1000,
      remainingMs: timeoutSec * 1000
    };
    this.selectedOption = 0;
    this.slideAnimProgress = 0;
    this.isClosing = false;

    if (this.audioManager) {
      this.audioManager.playSound('open');
    }
  }

  public setOutgoingRequest(targetPlayerId: string, targetPlayerName: string, timeoutSec: number = 15): void {
    this.outgoingRequest = {
      targetPlayerId,
      targetPlayerName,
      remainingMs: timeoutSec * 1000
    };
  }

  public clearOutgoingRequest(): void {
    this.outgoingRequest = null;
  }

  public clearIncomingRequest(): void {
    this.isClosing = true;
  }

  public update(dt: number): void {
    this.cursor.update(dt);

    // Slide animation update
    if (this.incomingRequest) {
      if (!this.isClosing) {
        this.slideAnimProgress = Math.min(1, this.slideAnimProgress + dt * 0.005);
      } else {
        this.slideAnimProgress = Math.max(0, this.slideAnimProgress - dt * 0.008);
        if (this.slideAnimProgress <= 0) {
          this.incomingRequest = null;
          this.isClosing = false;
        }
      }
    }

    // Update incoming request timer
    if (this.incomingRequest && !this.isClosing) {
      this.incomingRequest.remainingMs -= dt;
      if (this.incomingRequest.remainingMs <= 0) {
        this.declineIncoming();
      }
    }

    // Update outgoing request timer
    if (this.outgoingRequest) {
      this.outgoingRequest.remainingMs -= dt;
      if (this.outgoingRequest.remainingMs <= 0) {
        this.outgoingRequest = null;
      }
    }
  }

  public handleKeyDown(e: KeyboardEvent): boolean {
    if (!this.incomingRequest || this.isClosing) return false;

    const key = e.key.toLowerCase();

    // Hotkeys Y / N
    if (key === 'y') {
      this.acceptIncoming();
      return true;
    }
    if (key === 'n') {
      this.declineIncoming();
      return true;
    }

    // Navigation Up/Down or W/S
    if (key === 'arrowup' || key === 'w' || key === 'arrowleft' || key === 'a') {
      if (this.selectedOption !== 0) {
        this.selectedOption = 0;
        if (this.audioManager) this.audioManager.playSound('select');
      }
      return true;
    }
    if (key === 'arrowdown' || key === 's' || key === 'arrowright' || key === 'd') {
      if (this.selectedOption !== 1) {
        this.selectedOption = 1;
        if (this.audioManager) this.audioManager.playSound('select');
      }
      return true;
    }

    // Confirm Space / Enter
    if (key === 'enter' || key === ' ') {
      if (this.selectedOption === 0) {
        this.acceptIncoming();
      } else {
        this.declineIncoming();
      }
      return true;
    }

    // Escape declines
    if (key === 'escape') {
      this.declineIncoming();
      return true;
    }

    return false;
  }

  public handleMouseClick(x: number, y: number, canvasWidth: number, canvasHeight: number): boolean {
    if (!this.incomingRequest || this.isClosing) return false;

    // Calculate box geometry
    const boxWidth = 220;
    const boxHeight = 72;
    const targetX = canvasWidth - boxWidth - 8;
    const currentX = canvasWidth - (boxWidth + 8) * this.slideAnimProgress;
    const boxY = 8;

    if (x >= currentX && x <= currentX + boxWidth && y >= boxY && y <= boxY + boxHeight) {
      const acceptBtnY = boxY + 44;
      const declineBtnY = boxY + 44;

      if (x < currentX + boxWidth / 2) {
        this.selectedOption = 0;
        this.acceptIncoming();
      } else {
        this.selectedOption = 1;
        this.declineIncoming();
      }
      return true;
    }

    return false;
  }

  public acceptIncoming(): void {
    if (!this.incomingRequest) return;
    const req = { ...this.incomingRequest };
    if (this.audioManager) this.audioManager.playSound('select');
    this.isClosing = true;
    if (this.onAcceptCallback) this.onAcceptCallback(req);
  }

  public acceptIncomingRequest(): void {
    this.acceptIncoming();
  }

  public declineIncoming(): void {
    if (!this.incomingRequest) return;
    const req = { ...this.incomingRequest };
    if (this.audioManager) this.audioManager.playSound('cancel');
    this.isClosing = true;
    if (this.onDeclineCallback) this.onDeclineCallback(req);
  }

  public declineIncomingRequest(): void {
    this.declineIncoming();
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Render Outgoing request toast if active
    if (this.outgoingRequest) {
      this.renderOutgoingToast(ctx, width, height);
    }

    // Render Incoming request non-blocking popup
    if (this.incomingRequest && this.slideAnimProgress > 0) {
      this.renderIncomingPopup(ctx, width, height);
    }
  }

  private renderOutgoingToast(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const toastW = 190;
    const toastH = 26;
    const x = Math.round((width - toastW) / 2);
    const y = 8;

    ctx.save();
    ctx.fillStyle = 'rgba(20, 30, 45, 0.92)';
    ctx.fillRect(x, y, toastW, toastH);
    ctx.strokeStyle = '#3a5fcd';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1, y + 1, toastW - 2, toastH - 2);

    ctx.fillStyle = '#ffffff';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Challenging ${this.outgoingRequest?.targetPlayerName}...`, x + toastW / 2, y + toastH / 2);
    ctx.restore();
  }

  private renderIncomingPopup(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.incomingRequest) return;

    const boxWidth = 220;
    const boxHeight = 72;
    const startX = width + 10;
    const targetX = width - boxWidth - 8;
    const currentX = Math.round(startX + (targetX - startX) * this.slideAnimProgress);
    const boxY = 8;

    ctx.save();

    // Box Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(currentX + 3, boxY + 3, boxWidth, boxHeight);

    // Box Background (Classic Navy Window)
    ctx.fillStyle = '#101c2c';
    ctx.fillRect(currentX, boxY, boxWidth, boxHeight);

    // Double Frame Borders
    ctx.strokeStyle = '#f8f8f8';
    ctx.lineWidth = 2;
    ctx.strokeRect(currentX + 2, boxY + 2, boxWidth - 4, boxHeight - 4);

    ctx.strokeStyle = '#5a78a0';
    ctx.lineWidth = 1;
    ctx.strokeRect(currentX + 5, boxY + 5, boxWidth - 10, boxHeight - 10);

    // Header Text
    ctx.fillStyle = '#f1c40f';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PVP BATTLE CHALLENGE!', currentX + 10, boxY + 10);

    ctx.fillStyle = '#ffffff';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText(`${this.incomingRequest.fromPlayerName} wants to battle!`, currentX + 10, boxY + 24);

    // Countdown Progress Bar
    const timeRatio = Math.max(0, this.incomingRequest.remainingMs / this.incomingRequest.timeoutMs);
    const barW = boxWidth - 20;
    ctx.fillStyle = '#222222';
    ctx.fillRect(currentX + 10, boxY + 36, barW, 4);
    ctx.fillStyle = timeRatio > 0.3 ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(currentX + 10, boxY + 36, barW * timeRatio, 4);

    // Options: ACCEPT / DECLINE
    const optY = boxY + 52;
    const acceptX = currentX + 30;
    const declineX = currentX + 130;

    // Set cursor position
    const targetCursorX = this.selectedOption === 0 ? acceptX - 12 : declineX - 12;
    this.cursor.setTarget(targetCursorX, optY + 3, false);
    this.cursor.render(ctx);

    ctx.fillStyle = this.selectedOption === 0 ? '#2ecc71' : '#bdc3c7';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('ACCEPT [Y]', acceptX, optY);

    ctx.fillStyle = this.selectedOption === 1 ? '#e74c3c' : '#bdc3c7';
    ctx.fillText('DECLINE [N]', declineX, optY);

    ctx.restore();
  }
}
