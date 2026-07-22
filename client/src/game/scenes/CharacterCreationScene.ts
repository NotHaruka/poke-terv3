import { Scene } from '../../engine/SceneManager.js';
import { Renderer } from '../../engine/Renderer.js';
import { InputManager } from '../../engine/InputManager.js';
import { AudioManager } from '../../engine/AudioManager.js';
import { NetworkClient } from '../network/NetworkClient.js';
import { OverworldScene } from './OverworldScene.js';
import { PlayerProfile, Direction } from 'poke-ter-shared';
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
  
  // Customization
  private profile: PlayerProfile = {
    name: '',
    bodyType: 'male',
    hairStyle: 'Short',
    hairColor: '#000000',
    skinTone: '#ffccaa',
    eyeColor: '#000000',
    shirtColor: '#3a8be8',
    pantsColor: '#1e5b9e',
    shoesColor: '#444444',
    hatType: 'Cap',
    backpackType: 'Standard'
  };

  private styleSelectedIndex = 0;
  
  private customCategories = ['Hair Style', 'Hair Color', 'Skin Tone', 'Eye Color', 'Shirt', 'Pants', 'Shoes', 'Hat', 'Backpack', 'Done'];
  private customIndex = 0;

  // Options
  private hairStyles = ['Short', 'Medium', 'Long', 'Spiky', 'Ponytail'];
  private hairColors = ['#000000', '#5c3a21', '#e2b810', '#cc2222', '#ffffff'];
  private skinTones = ['#ffccaa', '#e5a073', '#8d5524', '#c68642', '#f1c27d'];
  private eyeColors = ['#000000', '#1155cc', '#228822', '#5c3a21'];
  private clothColors = ['#3a8be8', '#cc2222', '#22cc22', '#eeeeee', '#222222'];
  private hatTypes = ['None', 'Cap'];
  private backpackTypes = ['Standard'];

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
    } else if (e.key.length === 1 && this.nameInput.length < 12) {
      if (/[a-zA-Z0-9 ]/.test(e.key)) {
        this.nameInput += e.key;
      }
    }
  }

  update(dt: number): void {
    this.time += dt;

    if (this.alpha < 1) {
      this.alpha = Math.min(1, this.alpha + dt * 0.001);
    }

    if (this.step === CreationStep.Name) {
      if (this.inputManager.justPressed('Enter')) {
        if (this.nameInput.trim().length > 0) {
          this.profile.name = this.nameInput.trim();
          this.step = CreationStep.Style;
        }
      }
    } else if (this.step === CreationStep.Style) {
      if (this.inputManager.justPressed('ArrowLeft') || this.inputManager.justPressed('KeyA')) {
        this.styleSelectedIndex = 0;
      }
      if (this.inputManager.justPressed('ArrowRight') || this.inputManager.justPressed('KeyD')) {
        this.styleSelectedIndex = 1;
      }
      if (this.inputManager.justPressed('Enter') || this.inputManager.justPressed('Space')) {
        this.profile.bodyType = this.styleSelectedIndex === 0 ? 'male' : 'female';
        this.step = CreationStep.Customize;
      }
    } else if (this.step === CreationStep.Customize) {
      if (this.inputManager.justPressed('ArrowUp') || this.inputManager.justPressed('KeyW')) {
        this.customIndex = (this.customIndex - 1 + this.customCategories.length) % this.customCategories.length;
      }
      if (this.inputManager.justPressed('ArrowDown') || this.inputManager.justPressed('KeyS')) {
        this.customIndex = (this.customIndex + 1) % this.customCategories.length;
      }
      if (this.inputManager.justPressed('ArrowLeft') || this.inputManager.justPressed('KeyA')) {
        this.changeCustomOption(-1);
      }
      if (this.inputManager.justPressed('ArrowRight') || this.inputManager.justPressed('KeyD')) {
        this.changeCustomOption(1);
      }
      if (this.inputManager.justPressed('Enter') || this.inputManager.justPressed('Space')) {
        if (this.customIndex === this.customCategories.length - 1) { // Done
          this.finishCreation();
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
    else if (cat === 'Skin Tone') this.profile.skinTone = this.cycleArray(this.skinTones, this.profile.skinTone, delta);
    else if (cat === 'Eye Color') this.profile.eyeColor = this.cycleArray(this.eyeColors, this.profile.eyeColor, delta);
    else if (cat === 'Shirt') this.profile.shirtColor = this.cycleArray(this.clothColors, this.profile.shirtColor, delta);
    else if (cat === 'Pants') this.profile.pantsColor = this.cycleArray(this.clothColors, this.profile.pantsColor, delta);
    else if (cat === 'Shoes') this.profile.shoesColor = this.cycleArray(this.clothColors, this.profile.shoesColor, delta);
    else if (cat === 'Hat') this.profile.hatType = this.cycleArray(this.hatTypes, this.profile.hatType, delta);
    else if (cat === 'Backpack') this.profile.backpackType = this.cycleArray(this.backpackTypes, this.profile.backpackType, delta);
  }

  private finishCreation(): void {
    localStorage.setItem('poketer_player_profile', JSON.stringify(this.profile));
    
    if (this.networkClient) {
      this.networkClient.setProfile(this.profile.name);
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

    // Background
    ctx.fillStyle = '#1e3264';
    ctx.fillRect(0, 0, w, h);
    
    // Draw title
    this.renderer.drawText('Trainer Card', w/2 - 36, 10, '#ffffff', '10px monospace');

    if (this.step === CreationStep.Name) {
      this.renderer.drawText('Enter your name:', w/2 - 40, h/2 - 20, '#ffffff');
      this.renderer.drawText(this.nameInput + (Math.floor(this.time / 500) % 2 === 0 ? '_' : ''), w/2 - (this.nameInput.length * 4), h/2, '#ffff00');
      this.renderer.drawText('Press ENTER to confirm', w/2 - 60, h - 20, '#aaaaaa');
    } 
    else if (this.step === CreationStep.Style) {
      this.renderer.drawText('Select Style:', w/2 - 35, h/2 - 40, '#ffffff');
      
      const maleColor = this.styleSelectedIndex === 0 ? '#ffff00' : '#ffffff';
      const femaleColor = this.styleSelectedIndex === 1 ? '#ffff00' : '#ffffff';
      
      this.renderer.drawText('Boy', w/2 - 40, h/2, maleColor);
      this.renderer.drawText('Girl', w/2 + 20, h/2, femaleColor);
      
      if (this.styleSelectedIndex === 0) this.renderer.drawText('>', w/2 - 50, h/2, '#ff0000');
      else this.renderer.drawText('>', w/2 + 10, h/2, '#ff0000');
      
      this.renderer.drawText('Use Left/Right + Enter', w/2 - 65, h - 20, '#aaaaaa');
    }
    else if (this.step === CreationStep.Customize) {
      // Draw Preview
      this.drawTrainerPreview(w/2 + 30, h/2, 2);
      
      // Draw Options
      let startY = 30;
      for (let i = 0; i < this.customCategories.length; i++) {
        const cat = this.customCategories[i];
        const color = i === this.customIndex ? '#ffff00' : '#aaaaaa';
        this.renderer.drawText(cat, 20, startY + i * 15, color);
        
        if (i === this.customIndex) {
          this.renderer.drawText('>', 10, startY + i * 15, '#ff0000');
        }
        
        // Value
        if (cat !== 'Done') {
          let val = '';
          if (cat === 'Hair Style') val = this.profile.hairStyle;
          else if (cat === 'Hair Color') val = 'Color';
          else if (cat === 'Skin Tone') val = 'Tone';
          else if (cat === 'Eye Color') val = 'Color';
          else if (cat === 'Shirt') val = 'Color';
          else if (cat === 'Pants') val = 'Color';
          else if (cat === 'Shoes') val = 'Color';
          else if (cat === 'Hat') val = this.profile.hatType;
          else if (cat === 'Backpack') val = this.profile.backpackType;
          
          this.renderer.drawText(val, 80, startY + i * 15, color);
        }
      }
    }
    
    ctx.restore();
  }

  private drawTrainerPreview(x: number, y: number, scale: number): void {
    const ctx = this.renderer.getContext();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    
    // Animate turning
    const dirIdx = Math.floor(this.time / 1000) % 4;
    const directions: Direction[] = ['down', 'right', 'up', 'left'];
    const dir = directions[dirIdx];

    PlayerRenderer.render(
      ctx,
      -8,
      -8,
      dir,
      false,
      0,
      x,
      this.profile
    );

    ctx.restore();
  }
}
