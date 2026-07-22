import { Menu } from './Menu.js';
import { Player } from '../../entities/Player.js';
import { PlayerProfile, Direction } from 'poke-ter-shared';
import { PlayerRenderer } from '../../../engine/rendering/PlayerRenderer.js';

export class OutfitMenu extends Menu {
  private player: Player;
  private onSave?: (profile: PlayerProfile) => void;
  private tempProfile: PlayerProfile;

  private customCategories = [
    'Hair Style',
    'Hair Color',
    'Shirt Color',
    'Pants Color',
    'Shoes Color',
    'Hat Type',
    'Backpack Type',
    'Skin Tone',
    'Eye Color',
    'Confirm Outfit',
    'Cancel'
  ];
  private selectedIndex = 0;

  private hairStyles = ['Short', 'Medium', 'Long', 'Spiky', 'Ponytail'];
  private hairColors = ['#000000', '#5c3a21', '#e2b810', '#cc2222', '#ffffff', '#8e44ad', '#16a085'];
  private skinTones = ['#ffccaa', '#e5a073', '#8d5524', '#c68642', '#f1c27d'];
  private eyeColors = ['#000000', '#1155cc', '#228822', '#5c3a21', '#e74c3c'];
  private clothColors = ['#3a8be8', '#cc2222', '#22cc22', '#eeeeee', '#222222', '#f39c12', '#9b59b6', '#e84393', '#16a085'];
  private pantsColors = ['#1e5b9e', '#222222', '#8b4513', '#2ecc71', '#e74c3c', '#34495e', '#fd79a8'];
  private shoeColors = ['#444444', '#cc2222', '#ffffff', '#f1c40f', '#8e44ad', '#27ae60'];
  private hatTypes = ['None', 'Cap'];
  private backpackTypes = ['None', 'Standard'];

  private animTimer = 0;

  constructor(player: Player, onSave?: (profile: PlayerProfile) => void) {
    super();
    this.player = player;
    this.onSave = onSave;
    this.tempProfile = {
      ...(player.profile || {
        name: 'Trainer',
        bodyType: 'male',
        hairStyle: 'Short',
        hairColor: '#cc2222',
        skinTone: '#ffccaa',
        eyeColor: '#000000',
        shirtColor: '#3a8be8',
        pantsColor: '#1e5b9e',
        shoesColor: '#222222',
        hatType: 'Cap',
        backpackType: 'Standard',
      }),
    };
  }

  update(dt: number): void {
    super.update(dt);
    this.animTimer += dt;
  }

  onKeyDown(key: string): void {
    if (key === 'ArrowUp' || key === 'KeyW') {
      this.selectedIndex = (this.selectedIndex - 1 + this.customCategories.length) % this.customCategories.length;
      if (this.audioManager) this.audioManager.playSound('/menu_select.mp3', 0.4);
    } else if (key === 'ArrowDown' || key === 'KeyS') {
      this.selectedIndex = (this.selectedIndex + 1) % this.customCategories.length;
      if (this.audioManager) this.audioManager.playSound('/menu_select.mp3', 0.4);
    } else if (key === 'ArrowLeft' || key === 'KeyA') {
      this.changeOption(-1);
      if (this.audioManager) this.audioManager.playSound('/menu_move.mp3', 0.3);
    } else if (key === 'ArrowRight' || key === 'KeyD') {
      this.changeOption(1);
      if (this.audioManager) this.audioManager.playSound('/menu_move.mp3', 0.3);
    } else if (key === 'Enter' || key === 'Space') {
      const cat = this.customCategories[this.selectedIndex];
      if (cat === 'Confirm Outfit') {
        this.confirmOutfit();
      } else if (cat === 'Cancel') {
        this.close();
      } else {
        this.changeOption(1);
      }
    } else if (key === 'Escape') {
      this.close();
    }
  }

  private cycleArray(arr: string[], current: string, delta: number): string {
    const idx = arr.indexOf(current);
    if (idx === -1) return arr[0];
    let nextIdx = (idx + delta) % arr.length;
    if (nextIdx < 0) nextIdx += arr.length;
    return arr[nextIdx];
  }

  private changeOption(delta: number): void {
    const cat = this.customCategories[this.selectedIndex];
    if (cat === 'Hair Style') this.tempProfile.hairStyle = this.cycleArray(this.hairStyles, this.tempProfile.hairStyle, delta);
    else if (cat === 'Hair Color') this.tempProfile.hairColor = this.cycleArray(this.hairColors, this.tempProfile.hairColor, delta);
    else if (cat === 'Shirt Color') this.tempProfile.shirtColor = this.cycleArray(this.clothColors, this.tempProfile.shirtColor, delta);
    else if (cat === 'Pants Color') this.tempProfile.pantsColor = this.cycleArray(this.pantsColors, this.tempProfile.pantsColor, delta);
    else if (cat === 'Shoes Color') this.tempProfile.shoesColor = this.cycleArray(this.shoeColors, this.tempProfile.shoesColor, delta);
    else if (cat === 'Hat Type') this.tempProfile.hatType = this.cycleArray(this.hatTypes, this.tempProfile.hatType, delta);
    else if (cat === 'Backpack Type') this.tempProfile.backpackType = this.cycleArray(this.backpackTypes, this.tempProfile.backpackType, delta);
    else if (cat === 'Skin Tone') this.tempProfile.skinTone = this.cycleArray(this.skinTones, this.tempProfile.skinTone, delta);
    else if (cat === 'Eye Color') this.tempProfile.eyeColor = this.cycleArray(this.eyeColors, this.tempProfile.eyeColor, delta);
  }

  private confirmOutfit(): void {
    this.player.profile = { ...this.tempProfile };
    localStorage.setItem('poketer_player_profile', JSON.stringify(this.player.profile));
    if (this.onSave) {
      this.onSave(this.player.profile);
    }
    if (this.audioManager) this.audioManager.playSound('/fanfare.mp3', 0.5);
    this.close();
  }

  render(ctx: CanvasRenderingContext2D): void {
    const windowX = 10;
    const windowY = 10;
    const windowW = 300;
    const windowH = 220;

    this.drawWindow(ctx, windowX, windowY, windowW, windowH);

    ctx.save();
    ctx.globalAlpha = this.alpha;

    // Header Title
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("BELLA'S CHIC OUTFIT BOUTIQUE", windowX + windowW / 2, windowY + 16);

    ctx.strokeStyle = '#4deeea';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(windowX + 15, windowY + 22);
    ctx.lineTo(windowX + windowW - 15, windowY + 22);
    ctx.stroke();

    // Category List
    const startY = windowY + 32;
    const itemHeight = 16;

    for (let i = 0; i < this.customCategories.length; i++) {
      const cat = this.customCategories[i];
      const y = startY + i * itemHeight;
      const isSelected = i === this.selectedIndex;

      if (isSelected) {
        ctx.fillStyle = 'rgba(77, 238, 234, 0.25)';
        ctx.fillRect(windowX + 12, y - 2, 170, itemHeight - 2);
        ctx.fillStyle = '#ffe600';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('>', windowX + 16, y + 8);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
      }

      ctx.fillText(cat, windowX + 26, y + 8);

      // Value label or action label
      let valText = '';
      if (cat === 'Hair Style') valText = `< ${this.tempProfile.hairStyle} >`;
      else if (cat === 'Hair Color') valText = `< Color >`;
      else if (cat === 'Shirt Color') valText = `< Color >`;
      else if (cat === 'Pants Color') valText = `< Color >`;
      else if (cat === 'Shoes Color') valText = `< Color >`;
      else if (cat === 'Hat Type') valText = `< ${this.tempProfile.hatType} >`;
      else if (cat === 'Backpack Type') valText = `< ${this.tempProfile.backpackType} >`;
      else if (cat === 'Skin Tone') valText = `< Tone >`;
      else if (cat === 'Eye Color') valText = `< Color >`;

      if (valText) {
        ctx.fillStyle = isSelected ? '#4deeea' : '#888888';
        ctx.textAlign = 'right';
        ctx.fillText(valText, windowX + 175, y + 8);
      }
    }

    // Live Trainer Preview Stage on the Right
    const stageX = windowX + 235;
    const stageY = windowY + 105;

    // Stage backdrop circle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(stageX, stageY, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Direction rotation loop for showcase
    const dirs: Direction[] = ['down', 'right', 'up', 'left'];
    const dirIdx = Math.floor(this.animTimer / 1000) % 4;
    const activeDir = dirs[dirIdx];

    // Scale up player preview on canvas
    ctx.save();
    ctx.translate(stageX - 16, stageY - 22);
    ctx.scale(2, 2);

    PlayerRenderer.render(
      ctx,
      0,
      0,
      activeDir,
      false,
      0,
      0,
      this.tempProfile,
      this.tempProfile.name
    );

    ctx.restore();

    // Controls hint
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('W/S: Select  |  A/D: Change  |  ENTER: Confirm', windowX + windowW / 2, windowY + windowH - 6);

    ctx.restore();
  }
}
