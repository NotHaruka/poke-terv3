import { BattleEvent, MonsterSnapshot } from 'poke-ter-shared';
import { BattleRenderer } from './BattleRenderer.js';
import { BattleMessageBox } from './BattleMessageBox.js';
import { AudioManager } from '../../engine/AudioManager.js';

export class BattleAnimationManager {
  private queue: BattleEvent[] = [];
  private currentEvent: BattleEvent | null = null;
  private isProcessing: boolean = false;
  private eventTimer: number = 0;
  private onCompleteCallback?: () => void;

  private renderer: BattleRenderer;
  private msgBox: BattleMessageBox;
  private audioManager: AudioManager | null = null;

  // Active smooth HP lerp tracking
  public playerHpTarget: number | null = null;
  public opponentHpTarget: number | null = null;

  constructor(renderer: BattleRenderer, msgBox: BattleMessageBox, audioManager: AudioManager | null = null) {
    this.renderer = renderer;
    this.msgBox = msgBox;
    this.audioManager = audioManager;
  }

  public isAnimating(): boolean {
    return this.isProcessing || this.queue.length > 0 || this.currentEvent !== null;
  }

  public playEventSequence(events: BattleEvent[], onComplete?: () => void): void {
    this.queue = [...events];
    this.onCompleteCallback = onComplete;
    this.isProcessing = true;
    this.advanceQueue();
  }

  public update(dt: number): void {
    if (!this.isProcessing) return;

    this.eventTimer += dt;

    if (this.currentEvent) {
      if (this.currentEvent.type === 'message') {
        this.msgBox.update(dt);
        if (this.msgBox.isComplete() && this.eventTimer > 600) {
          this.advanceQueue();
        }
      } else if (this.currentEvent.type === 'damage' || this.currentEvent.type === 'action') {
        if (this.eventTimer > 500) {
          this.advanceQueue();
        }
      } else if (this.currentEvent.type === 'faint') {
        const progress = Math.min(1, this.eventTimer / 600);
        if (this.currentEvent.target === 'opponent') {
          this.renderer.opponentMonFaintOffsetY = progress * 40;
          this.renderer.opponentMonOpacity = 1 - progress;
        } else {
          this.renderer.playerMonFaintOffsetY = progress * 40;
          this.renderer.playerMonOpacity = 1 - progress;
        }
        if (progress >= 1.0) {
          this.advanceQueue();
        }
      } else if (this.currentEvent.type === 'switch') {
        if (this.eventTimer > 700) {
          this.advanceQueue();
        }
      } else {
        if (this.eventTimer > 400) {
          this.advanceQueue();
        }
      }
    }
  }

  public handleInput(): void {
    if (this.currentEvent && this.currentEvent.type === 'message') {
      if (!this.msgBox.isComplete()) {
        this.msgBox.completeInstantly();
      } else {
        this.advanceQueue();
      }
    }
  }

  private advanceQueue(): void {
    if (this.queue.length === 0) {
      this.currentEvent = null;
      this.isProcessing = false;
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
      return;
    }

    this.currentEvent = this.queue.shift()!;
    this.eventTimer = 0;

    const ev = this.currentEvent;

    if (ev.type === 'message') {
      this.msgBox.setText(ev.text);
    } else if (ev.type === 'action') {
      const source = ev.source;
      const targetSide = source === 'player' ? 'opponent' : 'player';
      const targetX = targetSide === 'opponent' ? 235 : 85;
      const targetY = targetSide === 'opponent' ? 80 : 145;

      this.renderer.spawnBurstParticles(targetX, targetY, '#f39c12', 15);
      if (this.audioManager) this.audioManager.playSound('bump');
    } else if (ev.type === 'damage') {
      const targetX = ev.target === 'opponent' ? 235 : 85;
      const targetY = ev.target === 'opponent' ? 80 : 145;

      if (ev.isCrit) {
        this.renderer.triggerScreenShake(0.35, 6);
        this.renderer.spawnBurstParticles(targetX, targetY, '#e74c3c', 25);
        if (this.audioManager) this.audioManager.playSound('bump', 0.8);
      } else {
        this.renderer.spawnBurstParticles(targetX, targetY, '#ffffff', 12);
        if (this.audioManager) this.audioManager.playSound('bump', 0.4);
      }
    } else if (ev.type === 'faint') {
      if (this.audioManager) this.audioManager.playSound('cancel');
    } else if (ev.type === 'switch') {
      if (ev.target === 'opponent') {
        this.renderer.opponentMonFaintOffsetY = 0;
        this.renderer.opponentMonOpacity = 1;
        this.renderer.throwPokeball('opponent');
      } else {
        this.renderer.playerMonFaintOffsetY = 0;
        this.renderer.playerMonOpacity = 1;
        this.renderer.throwPokeball('player');
      }
    }
  }
}
