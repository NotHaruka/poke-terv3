import { Scene } from '../../engine/SceneManager.js';
import { Renderer } from '../../engine/Renderer.js';
import { InputManager } from '../../engine/InputManager.js';
import { AudioManager } from '../../engine/AudioManager.js';
import { NetworkClient } from '../network/NetworkClient.js';
import { CharacterCreationScene } from './CharacterCreationScene.js';
import { OverworldScene } from './OverworldScene.js';
import { PlayerProfile } from 'poke-ter-shared';

export class TitleScreenScene implements Scene {
  private renderer: Renderer;
  private inputManager: InputManager;
  private networkClient: NetworkClient | null;
  private audioManager: AudioManager | null;

  private menuOptions: string[] = [];
  private selectedIndex = 0;
  private time = 0;
  private alpha = 0; // For fade in

  constructor(
    renderer: Renderer,
    inputManager: InputManager,
    networkClient: NetworkClient | null,
    audioManager: AudioManager | null
  ) {
    this.renderer = renderer;
    this.inputManager = inputManager;
    this.networkClient = networkClient;
    this.audioManager = audioManager;
    this.refreshMenuOptions();
  }

  init(): void {
    this.refreshMenuOptions();
    if (this.audioManager) {
      this.audioManager.playMusic('/sunlit_safari.mp3');
    }
  }

  private refreshMenuOptions(): void {
    const savedProfileStr = localStorage.getItem('poketer_player_profile');
    if (savedProfileStr) {
      this.menuOptions = ['Continue Game', 'Reset Character', 'Settings'];
    } else {
      this.menuOptions = ['New Game', 'Settings'];
    }
    this.selectedIndex = 0;
  }

  update(dt: number): void {
    this.time += dt;

    if (this.alpha < 1) {
      this.alpha = Math.min(1, this.alpha + dt * 0.001); // 1 second fade in
    }

    if (this.inputManager.justPressed('ArrowUp') || this.inputManager.justPressed('KeyW')) {
      this.selectedIndex = (this.selectedIndex - 1 + this.menuOptions.length) % this.menuOptions.length;
      if (this.audioManager) this.audioManager.playSFX('select');
    }

    if (this.inputManager.justPressed('ArrowDown') || this.inputManager.justPressed('KeyS')) {
      this.selectedIndex = (this.selectedIndex + 1) % this.menuOptions.length;
      if (this.audioManager) this.audioManager.playSFX('select');
    }

    if (this.inputManager.justPressed('Enter') || this.inputManager.justPressed('Space')) {
      this.selectOption();
    }
  }

  private selectOption(): void {
    const selected = this.menuOptions[this.selectedIndex];

    if (selected === 'Continue Game') {
      this.enterGame();
    } else if (selected === 'New Game') {
      const game = (window as any).__game;
      const sceneManager = game.sceneManager;
      const charCreation = new CharacterCreationScene(this.renderer, this.inputManager, this.networkClient, this.audioManager);
      sceneManager.replace(charCreation);
    } else if (selected === 'Reset Character') {
      // Wipe character data & restart character creation
      localStorage.removeItem('poketer_player_profile');
      if (this.audioManager) this.audioManager.playSFX('cancel');

      const game = (window as any).__game;
      const sceneManager = game.sceneManager;
      const charCreation = new CharacterCreationScene(this.renderer, this.inputManager, this.networkClient, this.audioManager);
      sceneManager.replace(charCreation);
    } else if (selected === 'Settings') {
      // Settings toast or toggle
      if (this.audioManager) this.audioManager.playSFX('select');
    }
  }

  private enterGame(): void {
    const savedProfileStr = localStorage.getItem('poketer_player_profile');
    
    // Quick scene manager access via a global or pass it? Wait, how does scene change?
    // We can emit an event or access game context. Let's just create a global or pass scene manager.
    const game = (window as any).__game;
    const sceneManager = game.sceneManager;

    if (savedProfileStr) {
      // Profile exists, go straight to overworld
      const profile = JSON.parse(savedProfileStr) as PlayerProfile;
      if (this.networkClient) {
        this.networkClient.setProfile(profile.name);
      }
      const overworld = new OverworldScene(this.renderer, this.inputManager, this.networkClient, this.audioManager, profile);
      sceneManager.replace(overworld);
    } else {
      // Create new profile
      const charCreation = new CharacterCreationScene(this.renderer, this.inputManager, this.networkClient, this.audioManager);
      sceneManager.replace(charCreation);
    }
  }

  render(): void {
    const w = this.renderer.getWidth();
    const h = this.renderer.getHeight();
    
    const ctx = this.renderer.getContext();
    ctx.save();
    ctx.globalAlpha = this.alpha;

    // Pixel-art background (gradient for now)
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a2a6c');
    gradient.addColorStop(0.5, '#b21f1f');
    gradient.addColorStop(1, '#fdbb2d');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Floating particles (simple)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (let i = 0; i < 20; i++) {
      const px = (Math.sin(this.time * 0.001 + i) * w/2) + w/2;
      const py = (h - ((this.time * 0.02 + i * 20) % h));
      ctx.fillRect(px, py, 2, 2);
    }

    // Logo bounce
    const bounce = Math.sin(this.time * 0.002) * 5;
    
    // Logo text
    this.renderer.drawText('Poke-ter', w / 2, h / 4 + bounce, '#ffffff', '16px monospace', 'center');
    this.renderer.drawText('Online', w / 2, h / 4 + 20 + bounce, '#ffcc00', '12px monospace', 'center');

    // Menu options
    const startY = h / 2 + 20;
    for (let i = 0; i < this.menuOptions.length; i++) {
      const y = startY + i * 20;
      const color = i === this.selectedIndex ? '#ffffff' : '#888888';
      this.renderer.drawText(this.menuOptions[i], w / 2, y, color, '10px monospace', 'center');
      
      if (i === this.selectedIndex) {
        // Cursor placed elegantly 10px to the left of the option's left edge
        const textWidth = this.renderer.measureText(this.menuOptions[i], '10px monospace');
        const cursorX = w / 2 - textWidth / 2 - 12 + Math.sin(this.time * 0.01) * 2;
        this.renderer.drawText('>', cursorX, y, '#ff0000', '10px monospace', 'left');
      }
    }

    // Audio interaction prompt
    if (this.audioManager && !this.audioManager.userInteracted) {
      this.renderer.drawText('Click or press any key to play sound 🎵', w / 2, h - 14, '#ffcc00', '7px monospace', 'center');
    }

    ctx.restore();
  }
}