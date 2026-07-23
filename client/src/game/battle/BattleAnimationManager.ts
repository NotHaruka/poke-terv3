import { BattleEvent, MonsterSnapshot } from 'poke-ter-shared';
import { BattleRenderer } from './BattleRenderer.js';
import { BattleMessageBox } from './BattleMessageBox.js';
import { AudioManager } from '../../engine/AudioManager.js';

export interface BattleContext {
  playerMon: MonsterSnapshot;
  opponentMon: MonsterSnapshot;
}

export class BattleAnimationManager {
  private renderer: BattleRenderer;
  private msgBox: BattleMessageBox;
  private audioManager: AudioManager | null = null;

  private isProcessing: boolean = false;
  private currentInputHandler: (() => void) | null = null;
  private activeUpdateCallback: ((dt: number) => void) | null = null;
  private onCompleteCallback?: () => void;

  public playerHpTarget: number | null = null;
  public opponentHpTarget: number | null = null;

  constructor(renderer: BattleRenderer, msgBox: BattleMessageBox, audioManager: AudioManager | null = null) {
    this.renderer = renderer;
    this.msgBox = msgBox;
    this.audioManager = audioManager;
  }

  public isAnimating(): boolean {
    return this.isProcessing;
  }

  public update(dt: number): void {
    if (this.activeUpdateCallback) {
      this.activeUpdateCallback(dt);
    }
  }

  public handleInput(): void {
    if (this.currentInputHandler) {
      this.currentInputHandler();
    }
  }

  public async playEventSequence(
    events: BattleEvent[],
    ctx: BattleContext,
    onComplete?: () => void
  ): Promise<void> {
    this.isProcessing = true;
    this.onCompleteCallback = onComplete;

    for (const ev of events) {
      await this.processEvent(ev, ctx);
    }

    this.isProcessing = false;
    this.activeUpdateCallback = null;
    this.currentInputHandler = null;

    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }
  }

  private async processEvent(ev: BattleEvent, ctx: BattleContext): Promise<void> {
    switch (ev.type) {
      case 'action':
        await this.runActionTask(ev, ctx);
        break;
      case 'message':
        await this.runMessageTask(ev.text);
        break;
      case 'damage':
        await this.runDamageTask(ev, ctx);
        break;
      case 'faint':
        await this.runFaintTask(ev, ctx);
        break;
      case 'switch':
        await this.runSwitchTask(ev, ctx);
        break;
      case 'heal':
        await this.runHealTask(ev, ctx);
        break;
      default:
        await this.delay(300);
        break;
    }
  }

  private runMessageTask(text: string): Promise<void> {
    return new Promise((resolve) => {
      this.msgBox.setText(text, 20);
      let isWaitingForRead = false;
      let readTimer = 0;

      this.currentInputHandler = () => {
        if (!this.msgBox.isComplete()) {
          this.msgBox.completeInstantly();
          isWaitingForRead = true;
          readTimer = 0;
        } else {
          cleanupAndResolve();
        }
      };

      const cleanupAndResolve = () => {
        this.activeUpdateCallback = null;
        this.currentInputHandler = null;
        resolve();
      };

      this.activeUpdateCallback = (dt: number) => {
        this.msgBox.update(dt);

        if (this.msgBox.isComplete()) {
          if (!isWaitingForRead) {
            isWaitingForRead = true;
            readTimer = 0;
          }
          readTimer += dt;
          if (readTimer >= 1100) {
            cleanupAndResolve();
          }
        }
      };
    });
  }

  private runActionTask(ev: Extract<BattleEvent, { type: 'action' }>, ctx: BattleContext): Promise<void> {
    return new Promise((resolve) => {
      const source = ev.source;
      const targetSide = source === 'player' ? 'opponent' : 'player';
      const targetX = targetSide === 'opponent' ? 235 : 85;
      const targetY = targetSide === 'opponent' ? 80 : 145;

      this.renderer.spawnBurstParticles(targetX, targetY, '#f39c12', 15);
      if (this.audioManager) this.audioManager.playSound('bump');

      let timer = 0;
      this.activeUpdateCallback = (dt: number) => {
        timer += dt;
        if (timer >= 450) {
          this.activeUpdateCallback = null;
          resolve();
        }
      };
    });
  }

  private runDamageTask(ev: Extract<BattleEvent, { type: 'damage' }>, ctx: BattleContext): Promise<void> {
    return new Promise((resolve) => {
      const targetMon = ev.target === 'player' ? ctx.playerMon : ctx.opponentMon;
      const targetX = ev.target === 'opponent' ? 235 : 85;
      const targetY = ev.target === 'opponent' ? 80 : 145;

      // 1. Hit particle burst & screen shake
      if (ev.isCrit) {
        this.renderer.triggerScreenShake(0.35, 6);
        this.renderer.spawnBurstParticles(targetX, targetY, '#e74c3c', 25);
        if (this.audioManager) this.audioManager.playSound('bump', 0.8);
      } else {
        this.renderer.spawnBurstParticles(targetX, targetY, '#ffffff', 12);
        if (this.audioManager) this.audioManager.playSound('bump', 0.4);
      }

      const startHp = targetMon.currentHp;
      const targetHp = Math.max(0, startHp - ev.amount);
      const hpDiff = startHp - targetHp;

      if (hpDiff <= 0) {
        targetMon.currentHp = targetHp;
        resolve();
        return;
      }

      // 2. Smooth HP Bar Decrease Animation
      let currentHpFloat = startHp;
      const drainRate = Math.max(25, hpDiff / 0.8);
      let tickTimer = 0;

      this.activeUpdateCallback = (dt: number) => {
        const dtSec = dt / 1000;
        currentHpFloat = Math.max(targetHp, currentHpFloat - drainRate * dtSec);
        targetMon.currentHp = Math.round(currentHpFloat);

        tickTimer += dt;
        if (tickTimer >= 80 && currentHpFloat > targetHp) {
          tickTimer = 0;
          if (this.audioManager) this.audioManager.playSound('select', 0.15);
        }

        if (currentHpFloat <= targetHp) {
          targetMon.currentHp = targetHp;
          this.activeUpdateCallback = null;
          resolve();
        }
      };
    });
  }

  private runHealTask(ev: Extract<BattleEvent, { type: 'heal' }>, ctx: BattleContext): Promise<void> {
    return new Promise((resolve) => {
      const targetMon = ev.target === 'player' ? ctx.playerMon : ctx.opponentMon;
      const startHp = targetMon.currentHp;
      const targetHp = Math.min(targetMon.maxHp, startHp + ev.amount);

      let currentHpFloat = startHp;
      const healRate = Math.max(25, (targetHp - startHp) / 0.8);

      this.activeUpdateCallback = (dt: number) => {
        const dtSec = dt / 1000;
        currentHpFloat = Math.min(targetHp, currentHpFloat + healRate * dtSec);
        targetMon.currentHp = Math.round(currentHpFloat);

        if (currentHpFloat >= targetHp) {
          targetMon.currentHp = targetHp;
          this.activeUpdateCallback = null;
          resolve();
        }
      };
    });
  }

  private runFaintTask(ev: Extract<BattleEvent, { type: 'faint' }>, ctx: BattleContext): Promise<void> {
    return new Promise((resolve) => {
      if (this.audioManager) this.audioManager.playSound('cancel');

      let elapsed = 0;
      const duration = 700;

      this.activeUpdateCallback = (dt: number) => {
        elapsed += dt;
        const progress = Math.min(1, elapsed / duration);

        if (ev.target === 'opponent') {
          this.renderer.opponentMonFaintOffsetY = progress * 40;
          this.renderer.opponentMonOpacity = 1 - progress;
        } else {
          this.renderer.playerMonFaintOffsetY = progress * 40;
          this.renderer.playerMonOpacity = 1 - progress;
        }

        if (progress >= 1.0) {
          this.activeUpdateCallback = null;
          resolve();
        }
      };
    });
  }

  private runSwitchTask(ev: Extract<BattleEvent, { type: 'switch' }>, ctx: BattleContext): Promise<void> {
    return new Promise((resolve) => {
      if (ev.target === 'opponent') {
        Object.assign(ctx.opponentMon, ev.monster);
        this.renderer.opponentMonFaintOffsetY = 0;
        this.renderer.opponentMonOpacity = 1;
        this.renderer.throwPokeball('opponent');
      } else {
        Object.assign(ctx.playerMon, ev.monster);
        this.renderer.playerMonFaintOffsetY = 0;
        this.renderer.playerMonOpacity = 1;
        this.renderer.throwPokeball('player');
      }

      let elapsed = 0;
      this.activeUpdateCallback = (dt: number) => {
        elapsed += dt;
        if (elapsed >= 700) {
          this.activeUpdateCallback = null;
          resolve();
        }
      };
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      let timer = 0;
      this.activeUpdateCallback = (dt: number) => {
        timer += dt;
        if (timer >= ms) {
          this.activeUpdateCallback = null;
          resolve();
        }
      };
    });
  }
}
