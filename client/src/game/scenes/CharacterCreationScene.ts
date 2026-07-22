import { Scene } from '../../engine/SceneManager.js';
import { Renderer } from '../../engine/Renderer.js';
import { InputManager } from '../../engine/InputManager.js';
import { AudioManager } from '../../engine/AudioManager.js';
import { NetworkClient } from '../network/NetworkClient.js';
import { OverworldScene } from './OverworldScene.js';
import { PlayerProfile, Direction, GAME_WIDTH, GAME_HEIGHT } from 'poke-ter-shared';
import { PlayerRenderer } from '../../engine/rendering/PlayerRenderer.js';

enum CreationStep {
  Name,
  Style,
  Customize
}

export class CharacterCreationScene implements Scene {
  private renderer: Renderer;
  private inputManager: InputManager;
  private networkClient: NetworkClient | null;
  private audioManager: AudioManager;

  private step: CreationStep = CreationStep.Name;
  private time = 0;
  private alpha = 0;

  // Name step
  private nameInput = '';
  
  // Customization Profile
  private profile: PlayerProfile = {
    name: '',
    bodyType: 'male',
    hairStyle: 'Short',
    hairColor: '#cc2222',
    skinTone: '#ffccaa',
    eyeColor: '#000000',
    shirtColor: '#3a8be8',
    pantsColor: '#1e5b9e',
    shoesColor: '#222222',
    hatType: 'Cap',
    backpackType: 'Standard'
  };

  private styleSelectedIndex = 0;
  
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
    'Confirm & Register'
  ];
  private customIndex = 0;

  // Aesthetic options aligned with Boutique (OutfitMenu)
  private hairStyles = ['Short', 'Medium', 'Long', 'Spiky', 'Ponytail'];
  private hairColors = ['#000000', '#5c3a21', '#e2b810', '#cc2222', '#ffffff', '#8e44ad', '#16a085'];
  private skinTones = ['#ffccaa', '#e5a073', '#8d5524', '#c68642', '#f1c27d'];
  private eyeColors = ['#000000', '#1155cc', '#228822', '#5c3a21', '#e74c3c'];
  private clothColors = ['#3a8be8', '#cc2222', '#22cc22', '#eeeeee', '#222222', '#f39c12', '#9b59b6', '#e84393', '#16a085'];
  private pantsColors = ['#1e5b9e', '#222222', '#8b4513', '#2ecc71', '#e74c3c', '#34495e', '#fd79a8'];
  private shoeColors = ['#444444', '#cc2222', '#ffffff', '#f1c40f', '#8e44ad', '#27ae60'];
  private hatTypes = ['None', 'Cap'];
  private backpackTypes = ['None', 'Standard'];

  private typingListener = (e: KeyboardEvent) => this.handleTyping(e);

  constructor(
    renderer: Renderer,
    inputManager: InputManager,
    networkClient: NetworkClient | null,
    audioManager: AudioManager
  ) {
    this.renderer = renderer;
    this.inputManager = inputManager;
    this.networkClient = networkClient;
    this.audioManager = audioManager;
  }

  init(): void {
    window.addEventListener('keydown', this.typingListener);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.typingListener);
  }

  private handleTyping(e: KeyboardEvent): void {
    if (this.step !== CreationStep.Name) return;

    if (e.key === 'Backspace') {
      this.nameInput = this.nameInput.slice(0, -1);
      if (this.audioManager) this.audioManager.playSFX('cancel');
    } else if (e.key.length === 1 && this.nameInput.length < 12) {
      if (/[a-zA-Z0-9 ]/.test(e.key)) {
        this.nameInput += e.key;
        if (this.audioManager) this.audioManager.playSFX('select');
      }
    }
  }

  update(dt: number): void {
    this.time += dt;

    if (this.alpha < 1) {
      this.alpha = Math.min(1, this.alpha + dt * 0.002);
    }

    if (this.step === CreationStep.Name) {
      if (this.inputManager.justPressed('Enter')) {
        if (this.nameInput.trim().length > 0) {
          this.profile.name = this.nameInput.trim();
          this.step = CreationStep.Style;
          if (this.audioManager) this.audioManager.playSFX('select');
        } else {
          if (this.audioManager) this.audioManager.playSFX('cancel');
        }
      }
    } else if (this.step === CreationStep.Style) {
      if (this.inputManager.justPressed('ArrowLeft') || this.inputManager.justPressed('KeyA')) {
        if (this.styleSelectedIndex !== 0) {
          this.styleSelectedIndex = 0;
          if (this.audioManager) this.audioManager.playSFX('select');
        }
      }
      if (this.inputManager.justPressed('ArrowRight') || this.inputManager.justPressed('KeyD')) {
        if (this.styleSelectedIndex !== 1) {
          this.styleSelectedIndex = 1;
          if (this.audioManager) this.audioManager.playSFX('select');
        }
      }
      if (this.inputManager.justPressed('Enter') || this.inputManager.justPressed('Space')) {
        this.profile.bodyType = this.styleSelectedIndex === 0 ? 'male' : 'female';
        this.step = CreationStep.Customize;
        if (this.audioManager) this.audioManager.playSFX('select');
      }
    } else if (this.step === CreationStep.Customize) {
      if (this.inputManager.justPressed('ArrowUp') || this.inputManager.justPressed('KeyW')) {
        this.customIndex = (this.customIndex - 1 + this.customCategories.length) % this.customCategories.length;
        if (this.audioManager) this.audioManager.playSFX('select');
      }
      if (this.inputManager.justPressed('ArrowDown') || this.inputManager.justPressed('KeyS')) {
        this.customIndex = (this.customIndex + 1) % this.customCategories.length;
        if (this.audioManager) this.audioManager.playSFX('select');
      }
      if (this.inputManager.justPressed('ArrowLeft') || this.inputManager.justPressed('KeyA')) {
        this.changeCustomOption(-1);
        if (this.audioManager) this.audioManager.playSFX('select');
      }
      if (this.inputManager.justPressed('ArrowRight') || this.inputManager.justPressed('KeyD')) {
        this.changeCustomOption(1);
        if (this.audioManager) this.audioManager.playSFX('select');
      }
      if (this.inputManager.justPressed('Enter') || this.inputManager.justPressed('Space')) {
        const cat = this.customCategories[this.customIndex];
        if (cat === 'Confirm & Register') {
          this.finishCreation();
        } else {
          this.changeCustomOption(1);
          if (this.audioManager) this.audioManager.playSFX('select');
        }
      }
    }
  }

  private cycleArray(arr: string[], current: string, delta: number): string {
    const idx = arr.indexOf(current);
    if (idx === -1) return arr[0];
    let nextIdx = (idx + delta) % arr.length;
    if (nextIdx < 0) nextIdx += arr.length;
    return arr[nextIdx];
  }

  private changeCustomOption(delta: number): void {
    const cat = this.customCategories[this.customIndex];
    if (cat === 'Hair Style') this.profile.hairStyle = this.cycleArray(this.hairStyles, this.profile.hairStyle, delta);
    else if (cat === 'Hair Color') this.profile.hairColor = this.cycleArray(this.hairColors, this.profile.hairColor, delta);
    else if (cat === 'Shirt Color') this.profile.shirtColor = this.cycleArray(this.clothColors, this.profile.shirtColor, delta);
    else if (cat === 'Pants Color') this.profile.pantsColor = this.cycleArray(this.pantsColors, this.profile.pantsColor, delta);
    else if (cat === 'Shoes Color') this.profile.shoesColor = this.cycleArray(this.shoeColors, this.profile.shoesColor, delta);
    else if (cat === 'Hat Type') this.profile.hatType = this.cycleArray(this.hatTypes, this.profile.hatType, delta);
    else if (cat === 'Backpack Type') this.profile.backpackType = this.cycleArray(this.backpackTypes, this.profile.backpackType, delta);
    else if (cat === 'Skin Tone') this.profile.skinTone = this.cycleArray(this.skinTones, this.profile.skinTone, delta);
    else if (cat === 'Eye Color') this.profile.eyeColor = this.cycleArray(this.eyeColors, this.profile.eyeColor, delta);
  }

  private finishCreation(): void {
    localStorage.setItem('poketer_player_profile', JSON.stringify(this.profile));
    
    if (this.networkClient) {
      this.networkClient.setProfile(this.profile.name);
    }
    
    if (this.audioManager) {
      this.audioManager.playSFX('open');
    }
    
    const game = (window as any).__game;
    const sceneManager = game.sceneManager;
    const overworld = new OverworldScene(this.renderer, this.inputManager, this.networkClient, this.audioManager, this.profile);
    sceneManager.replace(overworld);
  }

  render(): void {
    const w = this.renderer.getWidth();
    const h = this.renderer.getHeight();
    const ctx = this.renderer.getContext();
    
    ctx.save();
    ctx.globalAlpha = this.alpha;

    // Full Screen Background (Warm Sleek Pokemon Navy gradient/tone)
    ctx.fillStyle = '#0f1423';
    ctx.fillRect(0, 0, w, h);

    // Decorative grid/background details
    ctx.fillStyle = 'rgba(77, 238, 234, 0.03)';
    for (let x = 0; x < w; x += 16) {
      ctx.fillRect(x, 0, 1, h);
    }
    for (let y = 0; y < h; y += 16) {
      ctx.fillRect(0, y, w, 1);
    }

    if (this.step === CreationStep.Name) {
      this.renderNameStep(ctx, w, h);
    } else if (this.step === CreationStep.Style) {
      this.renderStyleStep(ctx, w, h);
    } else if (this.step === CreationStep.Customize) {
      this.renderCustomizeStep(ctx, w, h);
    }
    
    ctx.restore();
  }

  private renderNameStep(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const windowX = 20;
    const windowY = 30;
    const windowW = w - 40;
    const windowH = h - 60;

    this.drawStyledWindow(ctx, windowX, windowY, windowW, windowH, 'TRAINER REGISTRATION');

    // Prompt Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('PLEASE ENTER YOUR CHARACTER NAME:', windowX + windowW / 2, windowY + 45);

    // Input Box
    const inputW = 160;
    const inputH = 24;
    const inputX = windowX + (windowW - inputW) / 2;
    const inputY = windowY + 70;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(inputX, inputY, inputW, inputH);
    ctx.strokeStyle = '#4deeea';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(inputX, inputY, inputW, inputH);

    // Name Input Value
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const caret = Math.floor(this.time / 400) % 2 === 0 ? '_' : ' ';
    ctx.fillText(this.nameInput + caret, inputX + inputW / 2, inputY + inputH / 2);

    // Tip
    ctx.fillStyle = '#888888';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Max 12 characters. Letters & numbers only.', windowX + windowW / 2, windowY + 110);

    // Bottom Navigation Hint
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '7.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press [ENTER] to confirm & proceed', windowX + windowW / 2, windowY + windowH - 15);
  }

  private renderStyleStep(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const windowX = 15;
    const windowY = 15;
    const windowW = w - 30;
    const windowH = h - 30;

    this.drawStyledWindow(ctx, windowX, windowY, windowW, windowH, 'CHOOSE YOUR AVATAR');

    ctx.fillStyle = '#ffffff';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`WELCOME, ${this.profile.name.toUpperCase()}! CHOOSE A STYLE:`, windowX + windowW / 2, windowY + 32);

    // Dual Cards: BOY and GIRL
    const cardW = 95;
    const cardH = 115;
    const spacing = 18;
    const startX = windowX + (windowW - (cardW * 2 + spacing)) / 2;
    const cardY = windowY + 50;

    const cards = [
      { label: 'BOY', bodyType: 'male' as const, idx: 0 },
      { label: 'GIRL', bodyType: 'female' as const, idx: 1 }
    ];

    for (const card of cards) {
      const x = startX + card.idx * (cardW + spacing);
      const isSelected = this.styleSelectedIndex === card.idx;

      // Card Background
      ctx.fillStyle = isSelected ? 'rgba(77, 238, 234, 0.15)' : 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(x, cardY, cardW, cardH);

      // Card Border
      ctx.strokeStyle = isSelected ? '#ffe600' : '#4deeea';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(x, cardY, cardW, cardH);

      // Label
      ctx.fillStyle = isSelected ? '#ffe600' : '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(card.label, x + cardW / 2, cardY + 12);

      // Mini Stage Circle for Character
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.arc(x + cardW / 2, cardY + 70, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ffe600' : '#4deeea';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Render mini sprite inside stage
      ctx.save();
      ctx.translate(x + cardW / 2 - 16, cardY + 70 - 22);
      ctx.scale(2, 2);

      // Determine rotating direction for preview
      const dirs: Direction[] = ['down', 'right', 'up', 'left'];
      const dirIdx = Math.floor(this.time / 1000) % 4;
      const rotationDir = dirs[dirIdx];

      const demoProfile: PlayerProfile = {
        ...this.profile,
        bodyType: card.bodyType
      };

      PlayerRenderer.render(
        ctx,
        0,
        0,
        rotationDir,
        false,
        0,
        0,
        demoProfile,
        ''
      );

      ctx.restore();

      // Selector Cursor indicator
      if (isSelected) {
        ctx.fillStyle = '#ffe600';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('▶ ACTIVE ◀', x + cardW / 2, cardY + cardH - 12);
      } else {
        ctx.fillStyle = '#888888';
        ctx.font = '8px monospace';
        ctx.fillText('CHOOSE', x + cardW / 2, cardY + cardH - 12);
      }
    }

    // Bottom hint
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '7.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Use A/D or Left/Right Arrow  |  [ENTER] Select Style', windowX + windowW / 2, windowY + windowH - 12);
  }

  private renderCustomizeStep(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const windowX = 10;
    const windowY = 10;
    const windowW = w - 20;
    const windowH = h - 20;

    this.drawStyledWindow(ctx, windowX, windowY, windowW, windowH, 'CUSTOMIZE YOUR STYLE');

    // Left List of custom settings
    const startY = windowY + 34;
    const itemHeight = 15;

    ctx.textBaseline = 'middle';

    for (let i = 0; i < this.customCategories.length; i++) {
      const cat = this.customCategories[i];
      const y = startY + i * itemHeight;
      const isSelected = i === this.customIndex;

      if (isSelected) {
        ctx.fillStyle = 'rgba(77, 238, 234, 0.22)';
        ctx.fillRect(windowX + 12, y - 2, 172, itemHeight - 2);
        ctx.fillStyle = '#ffe600';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('>', windowX + 16, y + 4.5);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = '8.5px monospace';
        ctx.textAlign = 'left';
      }

      ctx.fillText(cat.toUpperCase(), windowX + 26, y + 4.5);

      // Render property values elegantly
      let valText = '';
      if (cat === 'Hair Style') valText = `< ${this.profile.hairStyle} >`;
      else if (cat === 'Hair Color') valText = `< Color >`;
      else if (cat === 'Shirt Color') valText = `< Color >`;
      else if (cat === 'Pants Color') valText = `< Color >`;
      else if (cat === 'Shoes Color') valText = `< Color >`;
      else if (cat === 'Hat Type') valText = `< ${this.profile.hatType} >`;
      else if (cat === 'Backpack Type') valText = `< ${this.profile.backpackType} >`;
      else if (cat === 'Skin Tone') valText = `< Tone >`;
      else if (cat === 'Eye Color') valText = `< Color >`;

      if (valText) {
        ctx.fillStyle = isSelected ? '#4deeea' : '#888888';
        ctx.textAlign = 'right';
        ctx.fillText(valText, windowX + 175, y + 4.5);
      }
    }

    // Right Side Preview Stage
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

    // Directions loop
    const dirs: Direction[] = ['down', 'right', 'up', 'left'];
    const dirIdx = Math.floor(this.time / 1000) % 4;
    const activeDir = dirs[dirIdx];

    // Render scaled trainer
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
      this.profile,
      ''
    );

    ctx.restore();

    // Right Side Profile Metadata Box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(windowX + 192, windowY + 155, 86, 30);
    ctx.strokeStyle = '#4deeea';
    ctx.lineWidth = 1;
    ctx.strokeRect(windowX + 192, windowY + 155, 86, 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TRAINER CARD', windowX + 192 + 43, windowY + 164);
    ctx.fillStyle = '#ffe600';
    ctx.fillText(this.profile.name.toUpperCase(), windowX + 192 + 43, windowY + 176);

    // Controls description bottom bar
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('W/S: Navigate  |  A/D: Change  |  [ENTER] Confirm Category', windowX + windowW / 2, windowY + windowH - 6);
  }

  private drawStyledWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string): void {
    // Translucent dark-navy background frame
    ctx.fillStyle = 'rgba(12, 18, 34, 0.96)';
    ctx.fillRect(x, y, w, h);

    // Multi-layered beautiful high-contrast borders
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

    ctx.strokeStyle = '#3a4a6b';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Title text
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(title, x + w / 2, y + 10);

    // Elegant divider line below title
    ctx.strokeStyle = '#4deeea';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 23);
    ctx.lineTo(x + w - 12, y + 23);
    ctx.stroke();
  }
}
