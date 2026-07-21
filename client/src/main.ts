/** Poke-ter - Main entry point */

import './style.css';
import { GameLoop } from './engine/GameLoop.js';
import { InputManager } from './engine/InputManager.js';
import { Renderer } from './engine/Renderer.js';
import { SceneManager } from './engine/SceneManager.js';
import { OverworldScene } from './game/scenes/OverworldScene.js';
import { NetworkClient } from './game/network/NetworkClient.js';
import { AudioManager } from './engine/AudioManager.js';

class PokeTerGame {
  private renderer: Renderer;
  private inputManager: InputManager;
  private sceneManager: SceneManager;
  private gameLoop: GameLoop;
  private networkClient: NetworkClient | null = null;
  private audioManager: AudioManager;

  constructor(container: HTMLElement) {
    // Initialize core systems
    this.renderer = new Renderer(container);
    this.inputManager = new InputManager();
    this.audioManager = new AudioManager();
    this.sceneManager = new SceneManager();

    // Attach input to canvas
    const canvas = this.renderer['canvas'] as HTMLCanvasElement;
    canvas.tabIndex = 0;
    canvas.focus();
    this.inputManager.attach(canvas);

    // Create game loop
    this.gameLoop = new GameLoop(
      (dt) => this.update(dt),
      (alpha) => this.render(),
    );

    // Try to connect to server first so we can pass it to scene
    this.networkClient = new NetworkClient('Player');
    this.tryConnect();

    // Start with overworld scene
    const overworld = new OverworldScene(this.renderer, this.inputManager, this.networkClient);
    this.sceneManager.push(overworld);

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
  }

  private render(): void {
    this.sceneManager.render();
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