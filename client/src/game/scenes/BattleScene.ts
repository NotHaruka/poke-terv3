import { Scene } from '../../engine/SceneManager.js';
import { Renderer } from '../../engine/Renderer.js';
import { InputManager } from '../../engine/InputManager.js';
import { NetworkClient } from '../network/NetworkClient.js';
import { AudioManager } from '../../engine/AudioManager.js';
import { 
  PacketType, BattleStartPacket, BattleActionData, 
  BattleResultPacket, MonsterSnapshot, getMonsterSpecies,
  MoveData, getMoveData
} from 'poke-ter-shared';

export class BattleScene implements Scene {
  private renderer: Renderer;
  private inputManager: InputManager;
  private networkClient: NetworkClient;
  private audioManager: AudioManager | null;
  private startPacket: BattleStartPacket;

  private state: 'CHOOSING_ACTION' | 'CHOOSING_MOVE' | 'WAITING' | 'ANIMATING' | 'ENDED' = 'CHOOSING_ACTION';
  private menuIndex = 0;
  private moveIndex = 0;
  
  private messages: string[] = [];
  private currentMessage = '';
  private messageTimer = 0;
  
  private p1Monsters: MonsterSnapshot[];
  private p2Monsters: MonsterSnapshot[];
  
  private p1Active: MonsterSnapshot;
  private p2Active: MonsterSnapshot;

  constructor(
    renderer: Renderer,
    inputManager: InputManager,
    networkClient: NetworkClient,
    audioManager: AudioManager | null,
    startPacket: BattleStartPacket
  ) {
    this.renderer = renderer;
    this.inputManager = inputManager;
    this.networkClient = networkClient;
    this.audioManager = audioManager;
    this.startPacket = startPacket;
    
    this.p1Monsters = startPacket.playerMonsters;
    this.p2Monsters = startPacket.opponentMonsters;
    
    this.p1Active = this.p1Monsters?.find(m => m.currentHp > 0) || this.p1Monsters?.[0];
    this.p2Active = this.p2Monsters?.find(m => m.currentHp > 0) || this.p2Monsters?.[0];
  }

  init(): void {
    if (this.audioManager) {
      this.audioManager.playMusic('/battle.mp3'); // Assuming there's a battle BGM
    }
    this.currentMessage = `Battle started against ${this.startPacket.opponentName}!`;
    this.state = 'ANIMATING'; // just show message first
    this.messages = [this.currentMessage];
    
    this.networkClient.on(32 /* BattleResult */, this.onBattleResult);
  }

  destroy(): void {
    if (this.audioManager) {
      // Restore overworld BGM
      this.audioManager.playMusic('/sunlit_safari.mp3');
    }
    this.networkClient.off(32 /* BattleResult */, this.onBattleResult);
  }

  private onBattleResult = (packet: any) => {
    const res = packet as BattleResultPacket;
    if (res.battleId !== this.startPacket.battleId) return;
    
    // Queue events for animation
    for (const ev of res.events) {
      if (ev.type === 'message') {
        this.messages.push(ev.text);
      } else if (ev.type === 'damage') {
        this.messages.push(`Damage dealt!`); // simplified
        if (ev.target === 'player') {
          this.p1Active.currentHp = Math.max(0, this.p1Active.currentHp - ev.amount);
        } else {
          this.p2Active.currentHp = Math.max(0, this.p2Active.currentHp - ev.amount);
        }
      } else if (ev.type === 'switch') {
        if (ev.target === 'player') {
          this.p1Active = ev.monster;
        } else {
          this.p2Active = ev.monster;
        }
      }
    }
    
    if (res.battleOver) {
      this.messages.push(`Battle Over! ${res.winner ? res.winner + ' wins!' : ''}`);
      this.messages.push('CLOSE_BATTLE');
    }
    
    if (this.state === 'WAITING') {
      this.state = 'ANIMATING';
      if (this.messages.length > 0) {
         this.currentMessage = this.messages.shift()!;
      }
    }
  }

  update(dt: number): void {
    if (this.state === 'ANIMATING') {
      this.messageTimer += dt;
      if (this.inputManager.justPressed('Space') || this.inputManager.justPressed('Enter') || this.messageTimer > 2000) {
        this.messageTimer = 0;
        if (this.messages.length > 0) {
          const nextMsg = this.messages.shift()!;
          if (nextMsg === 'CLOSE_BATTLE') {
            const game = (window as any).__game;
            game.sceneManager.pop();
          } else {
            this.currentMessage = nextMsg;
          }
        } else {
          this.state = 'CHOOSING_ACTION';
        }
      }
      return;
    }

    if (this.state === 'CHOOSING_ACTION') {
      if (this.inputManager.justPressed('ArrowRight') || this.inputManager.justPressed('KeyD')) {
        this.menuIndex = (this.menuIndex + 1) % 4;
      }
      if (this.inputManager.justPressed('ArrowLeft') || this.inputManager.justPressed('KeyA')) {
        this.menuIndex = (this.menuIndex - 1 + 4) % 4;
      }
      if (this.inputManager.justPressed('ArrowDown') || this.inputManager.justPressed('KeyS')) {
        this.menuIndex = (this.menuIndex + 2) % 4;
      }
      if (this.inputManager.justPressed('ArrowUp') || this.inputManager.justPressed('KeyW')) {
        this.menuIndex = (this.menuIndex - 2 + 4) % 4;
      }
      
      if (this.inputManager.justPressed('Space') || this.inputManager.justPressed('Enter')) {
        if (this.menuIndex === 0) { // Fight
          this.state = 'CHOOSING_MOVE';
          this.moveIndex = 0;
        } else if (this.menuIndex === 1) { // Bag
           // stub
        } else if (this.menuIndex === 2) { // Monster
           // stub
        } else if (this.menuIndex === 3) { // Run
          if (this.startPacket.isPvP) {
            this.messages = ["You can't run from a trainer battle!"];
            this.state = 'ANIMATING';
          }
        }
      }
    } else if (this.state === 'CHOOSING_MOVE') {
      if (this.inputManager.justPressed('Escape') || this.inputManager.justPressed('Backspace')) {
        this.state = 'CHOOSING_ACTION';
      }
      
      // Select move (simplified)
      if (this.inputManager.justPressed('ArrowDown')) this.moveIndex = (this.moveIndex + 1) % 4;
      if (this.inputManager.justPressed('ArrowUp')) this.moveIndex = (this.moveIndex - 1 + 4) % 4;

      if (this.inputManager.justPressed('Space') || this.inputManager.justPressed('Enter')) {
        this.networkClient.send({
          type: 31 /* BattleAction */,
          battleId: this.startPacket.battleId,
          action: { kind: 'attack', moveIndex: this.moveIndex }
        });
        this.state = 'WAITING';
        this.currentMessage = "Waiting for opponent...";
      }
    }
  }

  render(): void {
    const ctx = this.renderer.getContext();
    const w = this.renderer.getWidth();
    const h = this.renderer.getHeight();

    ctx.fillStyle = '#78C850'; // Grass background
    ctx.fillRect(0, 0, w, h);

    // Draw Opponent
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(w - 80, 80, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.font = '10px "Press Start 2P"';
    if (this.p2Active) {
      ctx.fillText(`${getMonsterSpecies(this.p2Active.speciesId)?.name || 'Unknown'} Lvl ${this.p2Active.level}`, w - 160, 30);
      ctx.fillStyle = 'red';
      ctx.fillRect(w - 160, 40, 100, 10);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(w - 160, 40, 100 * (this.p2Active.currentHp / this.p2Active.maxHp), 10);
    }

    // Draw Player
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(80, h - 120, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    if (this.p1Active) {
      ctx.fillText(`${getMonsterSpecies(this.p1Active.speciesId)?.name || 'Unknown'} Lvl ${this.p1Active.level}`, 20, h - 80);
      ctx.fillStyle = 'red';
      ctx.fillRect(20, h - 70, 100, 10);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(20, h - 70, 100 * (this.p1Active.currentHp / this.p1Active.maxHp), 10);
    }
    
    // UI Box
    const boxH = 60;
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, h - boxH, w, boxH);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, h - boxH, w, boxH);
    
    ctx.fillStyle = '#333';
    ctx.font = '10px "Press Start 2P"';

    if (this.state === 'ANIMATING' || this.state === 'WAITING') {
      ctx.fillText(this.currentMessage, 16, h - boxH + 24);
    } else if (this.state === 'CHOOSING_ACTION') {
      const options = ['FIGHT', 'BAG', 'MONSTER', 'RUN'];
      for(let i=0; i<4; i++) {
        const x = w/2 + (i%2)*80;
        const y = h - boxH + 24 + Math.floor(i/2)*20;
        if(this.menuIndex === i) {
          ctx.fillStyle = '#e74c3c';
          ctx.fillText('▶', x-12, y);
        }
        ctx.fillStyle = '#333';
        ctx.fillText(options[i], x, y);
      }
      ctx.fillText('What will you do?', 16, h - boxH + 24);
    } else if (this.state === 'CHOOSING_MOVE') {
      // Just draw moves list
      for(let i=0; i<4; i++) {
        const y = h - boxH + 16 + i*12;
        if(this.moveIndex === i) {
          ctx.fillStyle = '#e74c3c';
          ctx.fillText('▶', w/2-12, y);
        }
        ctx.fillStyle = '#333';
        ctx.fillText(`Move ${i+1}`, w/2, y);
      }
    }
  }
}
