import { MonsterSnapshot, MonsterInstance, MonsterType, getMoveData, getMonsterSpecies } from 'poke-ter-shared';
import { BattleCursor } from './BattleCursor.js';
import { AudioManager } from '../../engine/AudioManager.js';

export interface BattleUIMenuState {
  mainOptionIndex: number; // 0=FIGHT, 1=BAG, 2=PARTY, 3=RUN
  moveOptionIndex: number; // 0..3
  partyOptionIndex: number; // 0..5
  bagOptionIndex: number; // 0..3
}

export class BattleUI {
  private cursor: BattleCursor = new BattleCursor();
  private menuState: BattleUIMenuState = {
    mainOptionIndex: 0,
    moveOptionIndex: 0,
    partyOptionIndex: 0,
    bagOptionIndex: 0
  };

  private audioManager: AudioManager | null = null;

  constructor(audioManager: AudioManager | null = null) {
    this.audioManager = audioManager;
  }

  public getMenuState(): BattleUIMenuState {
    return this.menuState;
  }

  public update(dt: number): void {
    this.cursor.update(dt);
  }

  public handleMainMenuInput(inputKey: string): 'FIGHT' | 'BAG' | 'PARTY' | 'RUN' | null {
    const key = inputKey.toLowerCase();
    let idx = this.menuState.mainOptionIndex;

    if (key === 'arrowleft' || key === 'a' || key === 'keya') {
      if (idx % 2 === 1) idx -= 1;
      else idx += 1;
    } else if (key === 'arrowright' || key === 'd' || key === 'keyd') {
      if (idx % 2 === 0) idx += 1;
      else idx -= 1;
    } else if (key === 'arrowup' || key === 'w' || key === 'keyw') {
      if (idx >= 2) idx -= 2;
      else idx += 2;
    } else if (key === 'arrowdown' || key === 's' || key === 'keys') {
      if (idx < 2) idx += 2;
      else idx -= 2;
    }

    if (idx !== this.menuState.mainOptionIndex) {
      this.menuState.mainOptionIndex = idx;
      if (this.audioManager) this.audioManager.playSound('select');
    }

    if (key === 'enter' || key === 'space' || key === ' ') {
      if (this.audioManager) this.audioManager.playSound('select');
      switch (this.menuState.mainOptionIndex) {
        case 0: return 'FIGHT';
        case 1: return 'BAG';
        case 2: return 'PARTY';
        case 3: return 'RUN';
      }
    }

    return null;
  }

  public handleMoveMenuInput(inputKey: string, moveCount: number): { action: 'SELECT' | 'BACK'; moveIndex: number } | null {
    const key = inputKey.toLowerCase();
    let idx = this.menuState.moveOptionIndex;

    if (key === 'escape' || key === 'b' || key === 'keyb' || key === 'backspace') {
      if (this.audioManager) this.audioManager.playSound('cancel');
      return { action: 'BACK', moveIndex: 0 };
    }

    if (key === 'arrowleft' || key === 'a' || key === 'keya') {
      if (idx % 2 === 1) idx -= 1;
      else if (idx + 1 < moveCount) idx += 1;
    } else if (key === 'arrowright' || key === 'd' || key === 'keyd') {
      if (idx % 2 === 0 && idx + 1 < moveCount) idx += 1;
      else if (idx % 2 === 1) idx -= 1;
    } else if (key === 'arrowup' || key === 'w' || key === 'keyw') {
      if (idx >= 2) idx -= 2;
      else if (idx + 2 < moveCount) idx += 2;
    } else if (key === 'arrowdown' || key === 's' || key === 'keys') {
      if (idx + 2 < moveCount) idx += 2;
      else if (idx >= 2) idx -= 2;
    }

    if (idx !== this.menuState.moveOptionIndex) {
      this.menuState.moveOptionIndex = idx;
      if (this.audioManager) this.audioManager.playSound('select');
    }

    if (key === 'enter' || key === 'space' || key === ' ') {
      if (this.audioManager) this.audioManager.playSound('select');
      return { action: 'SELECT', moveIndex: this.menuState.moveOptionIndex };
    }

    return null;
  }

  public handlePartyMenuInput(inputKey: string, partyCount: number): { action: 'SELECT' | 'BACK'; slot: number } | null {
    const key = inputKey.toLowerCase();
    let idx = this.menuState.partyOptionIndex;

    if (key === 'escape' || key === 'b' || key === 'keyb' || key === 'backspace') {
      if (this.audioManager) this.audioManager.playSound('cancel');
      return { action: 'BACK', slot: 0 };
    }

    if (key === 'arrowup' || key === 'w' || key === 'keyw' || key === 'arrowleft' || key === 'a' || key === 'keya') {
      idx = (idx - 1 + partyCount) % Math.max(1, partyCount);
    } else if (key === 'arrowdown' || key === 's' || key === 'keys' || key === 'arrowright' || key === 'd' || key === 'keyd') {
      idx = (idx + 1) % Math.max(1, partyCount);
    }

    if (idx !== this.menuState.partyOptionIndex) {
      this.menuState.partyOptionIndex = idx;
      if (this.audioManager) this.audioManager.playSound('select');
    }

    if (key === 'enter' || key === 'space' || key === ' ') {
      if (this.audioManager) this.audioManager.playSound('select');
      return { action: 'SELECT', slot: this.menuState.partyOptionIndex };
    }

    return null;
  }

  public renderMainMenu(
    ctx: CanvasRenderingContext2D,
    activeMonName: string,
    x: number = 0,
    y: number = 180,
    width: number = 320,
    height: number = 60
  ): void {
    ctx.save();

    // Left Message Area
    const msgW = 180;
    ctx.fillStyle = '#101c2c';
    ctx.fillRect(x, y, msgW, height);
    ctx.strokeStyle = '#f8f8f8';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, msgW - 4, height - 4);

    ctx.fillStyle = '#ffffff';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('What will', x + 12, y + 16);
    ctx.fillText(`${activeMonName.toUpperCase()} do?`, x + 12, y + 30);

    // Right Action Grid Box
    const gridX = x + msgW;
    const gridW = width - msgW;
    ctx.fillStyle = '#f8f8f0';
    ctx.fillRect(gridX, y, gridW, height);
    ctx.strokeStyle = '#101010';
    ctx.lineWidth = 2;
    ctx.strokeRect(gridX, y, gridW, height);

    // Options Positions
    const opt0X = gridX + 24; const opt0Y = y + 18;
    const opt1X = gridX + 80; const opt1Y = y + 18;
    const opt2X = gridX + 24; const opt2Y = y + 38;
    const opt3X = gridX + 80; const opt3Y = y + 38;

    const positions = [
      { x: opt0X, y: opt0Y },
      { x: opt1X, y: opt1Y },
      { x: opt2X, y: opt2Y },
      { x: opt3X, y: opt3Y },
    ];

    const currentPos = positions[this.menuState.mainOptionIndex];
    this.cursor.setTarget(currentPos.x - 12, currentPos.y + 3, false);
    this.cursor.render(ctx);

    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#101010';
    ctx.fillText('FIGHT', opt0X, opt0Y);
    ctx.fillText('BAG', opt1X, opt1Y);
    ctx.fillText('PARTY', opt2X, opt2Y);
    ctx.fillText('RUN', opt3X, opt3Y);

    ctx.restore();
  }

  public renderMoveMenu(
    ctx: CanvasRenderingContext2D,
    moves: number[],
    x: number = 0,
    y: number = 180,
    width: number = 320,
    height: number = 60
  ): void {
    ctx.save();

    // Left Move Selection Grid (200px wide)
    const gridW = 200;
    ctx.fillStyle = '#f8f8f0';
    ctx.fillRect(x, y, gridW, height);
    ctx.strokeStyle = '#101010';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, gridW, height);

    const positions = [
      { x: x + 24, y: y + 18 },
      { x: x + 110, y: y + 18 },
      { x: x + 24, y: y + 38 },
      { x: x + 110, y: y + 38 },
    ];

    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#101010';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    for (let i = 0; i < 4; i++) {
      const pos = positions[i];
      if (i < moves.length) {
        const mData = getMoveData(moves[i]);
        ctx.fillText(mData.name.toUpperCase(), pos.x, pos.y);
      } else {
        ctx.fillStyle = '#808080';
        ctx.fillText('-', pos.x, pos.y);
        ctx.fillStyle = '#101010';
      }
    }

    // Set cursor on selected move
    const selPos = positions[this.menuState.moveOptionIndex];
    this.cursor.setTarget(selPos.x - 12, selPos.y + 3, false);
    this.cursor.render(ctx);

    // Right Info Box (PP & Type)
    const infoX = x + gridW;
    const infoW = width - gridW;
    ctx.fillStyle = '#101c2c';
    ctx.fillRect(infoX, y, infoW, height);
    ctx.strokeStyle = '#f8f8f8';
    ctx.lineWidth = 2;
    ctx.strokeRect(infoX + 2, y + 2, infoW - 4, height - 4);

    const selMoveId = moves[this.menuState.moveOptionIndex] || moves[0] || 1;
    const selMove = getMoveData(selMoveId);

    // Render Type Tag
    ctx.fillStyle = this.getTypeBadgeColor(selMove.type);
    ctx.fillRect(infoX + 10, y + 10, 52, 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(MonsterType[selMove.type].toUpperCase(), infoX + 36, y + 14);

    // PP
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`PP`, infoX + 10, y + 32);
    ctx.fillText(`${selMove.pp}/${selMove.pp}`, infoX + 36, y + 32);

    ctx.restore();
  }

  public renderPartyMenuModal(
    ctx: CanvasRenderingContext2D,
    party: MonsterSnapshot[] | MonsterInstance[],
    activeIndex: number
  ): void {
    ctx.save();

    // Dark backdrop overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, 320, 240);

    // Title Window
    ctx.fillStyle = '#101c2c';
    ctx.fillRect(10, 10, 300, 26);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(12, 12, 296, 22);

    ctx.fillStyle = '#f1c40f';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CHOOSE A MONSTER TO SWITCH OUT', 160, 22);

    // 6 Party Slots List
    for (let i = 0; i < Math.min(6, party.length); i++) {
      const mon = party[i];
      const slotY = 44 + i * 28;

      const isSelected = i === this.menuState.partyOptionIndex;
      const isActive = i === activeIndex;

      ctx.fillStyle = isSelected ? '#34495e' : '#1e2b37';
      ctx.fillRect(10, slotY, 300, 24);
      ctx.strokeStyle = isSelected ? '#f1c40f' : '#2c3e50';
      ctx.strokeRect(10, slotY, 300, 24);

      const species = getMonsterSpecies(mon.speciesId);
      const name = (mon.nickname || species?.name || 'Monster').toUpperCase();

      ctx.fillStyle = isActive ? '#2ecc71' : '#ffffff';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}. ${name}`, 20, slotY + 8);

      ctx.fillStyle = '#d35400';
      ctx.fillText(`Lv${mon.level}`, 140, slotY + 8);

      // HP Bar
      const hpRatio = Math.max(0, mon.currentHp / mon.maxHp);
      ctx.fillStyle = '#222';
      ctx.fillRect(200, slotY + 8, 50, 6);
      ctx.fillStyle = hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.2 ? '#f1c40f' : '#e74c3c';
      ctx.fillRect(200, slotY + 8, Math.floor(50 * hpRatio), 6);

      ctx.fillStyle = '#ffffff';
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillText(`${mon.currentHp}/${mon.maxHp}`, 260, slotY + 8);
    }

    ctx.restore();
  }

  private getTypeBadgeColor(type: MonsterType): string {
    switch (type) {
      case MonsterType.Fire: return '#e74c3c';
      case MonsterType.Water: return '#3498db';
      case MonsterType.Grass: return '#2ecc71';
      case MonsterType.Electric: return '#f1c40f';
      case MonsterType.Flying: return '#9b59b6';
      case MonsterType.Fighting: return '#d35400';
      case MonsterType.Dark: return '#34495e';
      default: return '#7f8c8d';
    }
  }
}
