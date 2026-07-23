import { Scene } from '../../engine/SceneManager.js';
import { Renderer } from '../../engine/Renderer.js';
import { InputManager } from '../../engine/InputManager.js';
import { NetworkClient } from '../network/NetworkClient.js';
import { AudioManager } from '../../engine/AudioManager.js';
import { 
  BattleStartPacket, BattleResultPacket, MonsterSnapshot,
  getDefaultMovesForSpecies, getMonsterSpecies
} from 'poke-ter-shared';

import { BattleRenderer } from '../battle/BattleRenderer.js';
import { BattleUI } from '../battle/BattleUI.js';
import { BattleMessageBox } from '../battle/BattleMessageBox.js';
import { BattleAnimationManager } from '../battle/BattleAnimationManager.js';
import { BattleStateMachine, BattleState } from '../battle/BattleStateMachine.js';

export class BattleScene implements Scene {
  private rendererEngine: Renderer;
  private inputManager: InputManager;
  private networkClient: NetworkClient;
  private audioManager: AudioManager | null;
  private startPacket: BattleStartPacket;

  private stateMachine: BattleStateMachine = new BattleStateMachine(BattleState.INTRO_SLIDE);
  private battleRenderer: BattleRenderer = new BattleRenderer();
  private msgBox: BattleMessageBox;
  private ui: BattleUI;
  private animManager: BattleAnimationManager;

  private p1Monsters: MonsterSnapshot[];
  private p2Monsters: MonsterSnapshot[];
  private p1ActiveIndex: number = 0;
  private p2ActiveIndex: number = 0;

  private p1Active: MonsterSnapshot;
  private p2Active: MonsterSnapshot;

  private activeMoves: number[] = [];
  private showPartyModal: boolean = false;

  private onExitCallback?: () => void;

  constructor(
    renderer: Renderer,
    inputManager: InputManager,
    networkClient: NetworkClient,
    audioManager: AudioManager | null,
    startPacket: BattleStartPacket,
    onExit?: () => void
  ) {
    this.rendererEngine = renderer;
    this.inputManager = inputManager;
    this.networkClient = networkClient;
    this.audioManager = audioManager;
    this.startPacket = startPacket;
    this.onExitCallback = onExit;

    this.p1Monsters = startPacket.playerMonsters || [];
    this.p2Monsters = startPacket.opponentMonsters || [];

    this.p1ActiveIndex = Math.max(0, this.p1Monsters.findIndex(m => m.currentHp > 0));
    this.p2ActiveIndex = Math.max(0, this.p2Monsters.findIndex(m => m.currentHp > 0));

    this.p1Active = this.p1Monsters[this.p1ActiveIndex] || { speciesId: 1, level: 5, currentHp: 20, maxHp: 20, stats: { hp:20, attack:10, defense:10, spAttack:10, spDefense:10, speed:10 }, status: 0 };
    this.p2Active = this.p2Monsters[this.p2ActiveIndex] || { speciesId: 4, level: 5, currentHp: 20, maxHp: 20, stats: { hp:20, attack:10, defense:10, spAttack:10, spDefense:10, speed:10 }, status: 0 };

    this.activeMoves = getDefaultMovesForSpecies(this.p1Active.speciesId);

    this.msgBox = new BattleMessageBox(audioManager);
    this.ui = new BattleUI(audioManager);
    this.animManager = new BattleAnimationManager(this.battleRenderer, this.msgBox, audioManager);
  }

  public init(): void {
    if (this.audioManager) {
      this.audioManager.playMusic('/sunlit_safari.mp3');
    }

    this.networkClient.on(32 /* BattleResult */, this.onBattleResult);

    // Start intro slide animation sequence
    this.stateMachine.setState(BattleState.INTRO_SLIDE);
    this.battleRenderer.opponentTrainerSlide = 0;
    this.battleRenderer.playerTrainerSlide = 0;
  }

  public destroy(): void {
    this.networkClient.off(32 /* BattleResult */, this.onBattleResult);
  }

  private onBattleResult = (packet: any) => {
    const res = packet as BattleResultPacket;
    if (res.battleId !== this.startPacket.battleId) return;

    this.stateMachine.setState(BattleState.ANIMATING_ROUND);
    this.animManager.playEventSequence(
      res.events,
      { playerMon: this.p1Active, opponentMon: this.p2Active },
      () => {
        if (res.battleOver) {
          if (res.winner === this.startPacket.opponentName) {
            this.stateMachine.setState(BattleState.DEFEAT);
            this.msgBox.setText("You were defeated...", 25);
          } else {
            this.stateMachine.setState(BattleState.VICTORY);
            this.msgBox.setText("You won the battle!", 25);
          }
        } else {
          this.stateMachine.setState(BattleState.MAIN_MENU);
        }
      }
    );
  };

  public update(dt: number): void {
    const state = this.stateMachine.getState();
    this.stateMachine.update(dt);
    this.battleRenderer.update(dt);
    this.ui.update(dt);
    this.msgBox.update(dt);
    this.animManager.update(dt);

    // Collect keyboard command from InputManager for WASD / Arrow keys
    let keyInput: string | null = null;
    if (this.inputManager.justPressed('KeyW') || this.inputManager.justPressed('ArrowUp')) keyInput = 'w';
    else if (this.inputManager.justPressed('KeyS') || this.inputManager.justPressed('ArrowDown')) keyInput = 's';
    else if (this.inputManager.justPressed('KeyA') || this.inputManager.justPressed('ArrowLeft')) keyInput = 'a';
    else if (this.inputManager.justPressed('KeyD') || this.inputManager.justPressed('ArrowRight')) keyInput = 'd';
    else if (this.inputManager.justPressed('Enter') || this.inputManager.justPressed('Space')) keyInput = 'enter';
    else if (this.inputManager.justPressed('Escape') || this.inputManager.justPressed('Backspace') || this.inputManager.justPressed('KeyB')) keyInput = 'escape';

    // INTRO SLIDE ANIMATION STAGE
    if (state === BattleState.INTRO_SLIDE) {
      this.battleRenderer.opponentTrainerSlide = Math.min(1, this.battleRenderer.opponentTrainerSlide + dt * 0.003);
      this.battleRenderer.playerTrainerSlide = Math.min(1, this.battleRenderer.playerTrainerSlide + dt * 0.003);

      if (this.battleRenderer.opponentTrainerSlide >= 1.0) {
        this.stateMachine.setState(BattleState.INTRO_TEXT);
        this.msgBox.setText(`Trainer ${this.startPacket.opponentName} wants to battle!`, 22);
      }
      return;
    }

    // INTRO TEXT STAGE
    if (state === BattleState.INTRO_TEXT) {
      if (keyInput) {
        if (this.msgBox.isComplete()) {
          this.stateMachine.setState(BattleState.INTRO_SEND_OUT);
          this.battleRenderer.throwCapturePod('opponent');
          this.battleRenderer.throwCapturePod('player');
          this.msgBox.setText(`Go! ${(this.p1Active.nickname || getMonsterSpecies(this.p1Active.speciesId)?.name || 'Monster')}!`, 22);
        } else {
          this.msgBox.completeInstantly();
        }
      }
      return;
    }

    // INTRO SEND OUT STAGE
    if (state === BattleState.INTRO_SEND_OUT) {
      if (this.msgBox.isComplete() && !this.battleRenderer.activeBallArc) {
        this.stateMachine.setState(BattleState.MAIN_MENU);
      }
      return;
    }

    // MAIN MENU INPUT
    if (state === BattleState.MAIN_MENU) {
      if (keyInput) {
        const choice = this.ui.handleMainMenuInput(keyInput);

        if (choice === 'FIGHT') {
          this.activeMoves = getDefaultMovesForSpecies(this.p1Active.speciesId);
          this.stateMachine.setState(BattleState.MOVE_MENU);
        } else if (choice === 'PARTY') {
          this.showPartyModal = true;
          this.stateMachine.setState(BattleState.PARTY_MENU);
        } else if (choice === 'RUN') {
          if (this.startPacket.isPvP) {
            this.msgBox.setText("Can't run from a trainer battle!", 22);
          } else {
            this.exitBattle();
          }
        }
      }
      return;
    }

    // MOVE MENU INPUT
    if (state === BattleState.MOVE_MENU) {
      if (keyInput) {
        const res = this.ui.handleMoveMenuInput(keyInput, this.activeMoves.length);
        if (res?.action === 'BACK') {
          this.stateMachine.setState(BattleState.MAIN_MENU);
        } else if (res?.action === 'SELECT') {
          this.networkClient.send({
            type: 31 /* BattleAction */,
            battleId: this.startPacket.battleId,
            action: { kind: 'attack', moveIndex: res.moveIndex }
          });

          this.stateMachine.setState(BattleState.WAITING_FOR_SERVER);
          this.msgBox.setText("Waiting for opponent...", 9999);
        }
      }
      return;
    }

    // PARTY MENU INPUT
    if (state === BattleState.PARTY_MENU) {
      if (keyInput) {
        const res = this.ui.handlePartyMenuInput(keyInput, this.p1Monsters.length);
        if (res?.action === 'BACK') {
          this.showPartyModal = false;
          this.stateMachine.setState(BattleState.MAIN_MENU);
        } else if (res?.action === 'SELECT') {
          if (res.slot === this.p1ActiveIndex) {
            this.msgBox.setText("Monster is already in battle!", 22);
          } else if (this.p1Monsters[res.slot] && this.p1Monsters[res.slot].currentHp <= 0) {
            this.msgBox.setText("That monster is defeated and cannot fight!", 22);
          } else {
            this.showPartyModal = false;
            this.networkClient.send({
              type: 31 /* BattleAction */,
              battleId: this.startPacket.battleId,
              action: { kind: 'switch', slot: res.slot }
            });

            this.stateMachine.setState(BattleState.WAITING_FOR_SERVER);
            this.msgBox.setText("Waiting for opponent...", 9999);
          }
        }
      }
      return;
    }

    // ANIMATING ROUND INPUT
    if (state === BattleState.ANIMATING_ROUND) {
      if (keyInput) {
        this.animManager.handleInput();
      }
      return;
    }

    // VICTORY OR DEFEAT
    if (state === BattleState.VICTORY || state === BattleState.DEFEAT) {
      if (keyInput === 'enter') {
        this.exitBattle();
      }
      return;
    }
  }

  private exitBattle(): void {
    if (this.onExitCallback) {
      this.onExitCallback();
    }
    const game = (window as any).__game;
    if (game && game.sceneManager) {
      game.sceneManager.pop();
    }
  }

  public render(): void {
    const ctx = this.rendererEngine.getContext();
    const w = this.rendererEngine.getWidth();
    const h = this.rendererEngine.getHeight();

    ctx.save();

    // Render 1. Background terrain
    this.battleRenderer.renderBackground(ctx, w, h, this.startPacket.env || 'grass');

    // Render 2. Trainers & Monsters
    const state = this.stateMachine.getState();
    const showTrainersInIntro = state === BattleState.INTRO_SLIDE || state === BattleState.INTRO_TEXT;

    this.battleRenderer.renderOpponentTrainer(ctx, this.startPacket.opponentName, showTrainersInIntro);
    this.battleRenderer.renderPlayerTrainer(ctx, showTrainersInIntro);

    if (!showTrainersInIntro || state === BattleState.INTRO_SEND_OUT || state === BattleState.MAIN_MENU || state === BattleState.MOVE_MENU || state === BattleState.ANIMATING_ROUND || state === BattleState.WAITING_FOR_SERVER) {
      this.battleRenderer.renderOpponentMonster(ctx, this.p2Active);
      this.battleRenderer.renderPlayerMonster(ctx, this.p1Active);
    }

    this.battleRenderer.renderActiveBallArc(ctx);
    this.battleRenderer.renderParticles(ctx);

    // Render 3. Status Info Frames (Opponent Top Left, Player Bottom Right)
    this.battleRenderer.renderOpponentStatusBox(ctx, this.p2Active);
    this.battleRenderer.renderPlayerStatusBox(ctx, this.p1Active, 0.65);

    // Render 4. Battle UI Controls & Text Boxes
    const activeMonName = this.p1Active.nickname || getMonsterSpecies(this.p1Active.speciesId)?.name || 'Monster';

    if (state === BattleState.MAIN_MENU) {
      this.ui.renderMainMenu(ctx, activeMonName, 0, 180, w, 60);
    } else if (state === BattleState.MOVE_MENU) {
      this.ui.renderMoveMenu(ctx, this.activeMoves, 0, 180, w, 60);
    } else if (this.showPartyModal || state === BattleState.PARTY_MENU) {
      this.ui.renderPartyMenuModal(ctx, this.p1Monsters, this.p1ActiveIndex);
    } else {
      this.msgBox.render(ctx, 0, 180, w, 60);
    }

    ctx.restore();
  }
}
