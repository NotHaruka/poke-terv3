import { InputManager } from '../../../engine/InputManager.js';
import { BaseMenu } from './Menu.js';
import { Player } from '../../entities/Player.js';
import { PlayerState } from 'poke-ter-shared';
import { AudioManager } from '../../../engine/AudioManager.js';

export class MenuManager {
  private activeMenu: BaseMenu | null = null;
  private inputManager: InputManager;
  private player: Player;
  private audioManager: AudioManager | null;

  constructor(inputManager: InputManager, player: Player, audioManager: AudioManager | null = null) {
    this.inputManager = inputManager;
    this.player = player;
    this.audioManager = audioManager;
  }

  openMenu(menu: BaseMenu): void {
    if (this.audioManager) this.audioManager.playSFX('open');
    this.activeMenu = menu;
    this.activeMenu.init(this.audioManager);
    
    if (this.player.state !== PlayerState.MenuOpen) {
      this.player.state = PlayerState.MenuOpen;
    }
  }

  closeMenu(): void {
    if (this.activeMenu) {
      if (this.audioManager) this.audioManager.playSFX('close');
      this.activeMenu.close();
    }
  }

  update(dt: number): void {
    if (this.activeMenu) {
      this.activeMenu.update(dt);
      
      // Handle keyboard input mapping for the menu
      const state = this.inputManager.getState();
      for (const key of state.pressedKeys) {
        this.activeMenu.onKeyDown(key);
      }

      if (this.activeMenu.isClosed()) {
        if (this.audioManager) this.audioManager.playSFX('close');
        this.activeMenu = null;
        if (this.player.state === PlayerState.MenuOpen) {
          this.player.state = PlayerState.Walking;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.activeMenu) {
      this.activeMenu.render(ctx);
    }
  }

  isOpen(): boolean {
    return this.activeMenu !== null;
  }
}
