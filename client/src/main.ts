/** Poke-ter - Main entry point */

import './style.css';
import { GameLoop } from './engine/utils/GameLoop.js';
import { InputManager } from './engine/input/InputManager.js';
import { Renderer } from './engine/renderer/Renderer.js';
import { SceneManager } from './engine/renderer/SceneManager.js';
import { TitleScreenScene } from './game/scenes/TitleScreenScene.js';
import { WorldSync } from './game/pokemon/multiplayer/WorldSync.js';
import { AudioManager } from './engine/audio/AudioManager.js';
import { MusicManager } from './engine/audio/MusicManager.js';
import { InteriorRegistry } from './engine/interiors/InteriorRegistry.js';
import { TouchControls } from './engine/input/TouchControls.js';

class PokeTerGame {
  private renderer: Renderer;
  private inputManager: InputManager;
  private touchControls: TouchControls;
  public sceneManager: SceneManager; // Make public to access from scenes easily
  private gameLoop: GameLoop;
  private networkClient: WorldSync | null = null;
  private audioManager: AudioManager;
  public musicManager: MusicManager;

  constructor(container: HTMLElement) {
    // Initialize core systems
    this.renderer = new Renderer(container);
    this.inputManager = new InputManager();
    this.touchControls = new TouchControls(container, this.inputManager);
    this.audioManager = new AudioManager();
    this.musicManager = new MusicManager(this.audioManager);
    this.sceneManager = new SceneManager();
    
    // Initialize registries
    InteriorRegistry.init();

    // Attach input to canvas
    const canvas = this.renderer.getCanvas();
    canvas.tabIndex = 0;
    canvas.focus();
    this.inputManager.attach(canvas);

    // Create game loop
    this.gameLoop = new GameLoop(
      (dt) => this.update(dt),
      (alpha) => this.render(),
    );

    // Try to connect to server first so we can pass it to scene
    this.networkClient = new WorldSync('Player');
    this.tryConnect();

    // Start with title scene
    const title = new TitleScreenScene(this.renderer, this.inputManager, this.networkClient, this.audioManager);
    this.sceneManager.push(title);

    // Start the game loop
    this.gameLoop.start();
  }

  private tryConnect(): void {
    try {
      this.networkClient?.connect();
    } catch {
      // Server not available - play offline
      console.log('Playing offline - no server available');
    }
  }

  private update(dt: number): void {
    this.sceneManager.update(dt);
    this.inputManager.update();
  }

  private render(): void {
    this.renderer.clear();
    this.sceneManager.render();
    this.renderer.present();
  }

  destroy(): void {
    this.gameLoop.stop();
    this.inputManager.detach(this.renderer['canvas'] as HTMLCanvasElement);
    this.networkClient?.disconnect();
    this.sceneManager.clear();
    this.renderer.destroy();
  }
}

// Bootstrap
function bootstrap(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('No #app element found');
    return;
  }

  const game = new PokeTerGame(app);

  // Expose for debugging
  (window as unknown as Record<string, unknown>).__game = game;
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}