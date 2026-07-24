import { Scene } from '../../engine/SceneManager.js';
import { Renderer } from '../../engine/Renderer.js';
import { InputManager } from '../../engine/InputManager.js';
import { AudioManager } from '../../engine/AudioManager.js';
import { WorldSync } from '../network/WorldSync.js';
import { CharacterCreationScene } from './CharacterCreationScene.js';
import { OverworldScene } from './OverworldScene.js';
import { PlayerProfile } from 'poke-ter-shared';

export class TitleScreenScene implements Scene {
  private renderer: Renderer;
  private inputManager: InputManager;
  private networkClient: WorldSync | null;
  private audioManager: AudioManager | null;

  private menuOptions: string[] = [];
  private selectedIndex = 0;
  private time = 0;
  private alpha = 0; // For fade in

  constructor(
    renderer: Renderer,
    inputManager: InputManager,
    networkClient: WorldSync | null,
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
    const game = (window as any).__game;
    if (game && game.musicManager) {
      game.musicManager.updateState({ scene: 'title' });
    } else if (this.audioManager) {
      this.audioManager.playMusic('/sunlit_safari.mp3');
    }
  }

  private refreshMenuOptions(): void {
    const savedProfileStr = localStorage.getItem('poketer_player_profile');
    if (savedProfileStr) {
      this.menuOptions = ['Continue Game', 'Connect to Host', 'Reset Character', 'Settings'];
    } else {
      this.menuOptions = ['New Game', 'Connect to Host', 'Settings'];
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
    } else if (selected === 'Connect to Host') {
      if (this.audioManager) this.audioManager.playSFX('select');
      this.showConnectToHostModal();
    } else if (selected === 'Reset Character') {
      // Wipe character data & restart character creation
      localStorage.removeItem('poketer_player_profile');
      localStorage.removeItem('poketer_player_data');
      localStorage.removeItem('poketer_client_id');
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

  private showConnectToHostModal(): void {
    // Prevent key listener from running while modal is open
    const prevUpdate = this.update;
    this.update = () => {}; // temporarily freeze scene updates

    const modal = document.createElement('div');
    modal.id = 'connect-host-modal';
    modal.style.position = 'absolute';
    modal.style.inset = '0';
    modal.style.background = 'rgba(15, 23, 42, 0.75)';
    modal.style.backdropFilter = 'blur(6px)';
    modal.style.webkitBackdropFilter = 'blur(6px)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '200';
    modal.style.padding = '16px';
    modal.style.fontFamily = 'monospace';

    const lastHost = localStorage.getItem('poketer_last_host') || window.location.hostname;

    modal.innerHTML = `
      <div style="
        background: #1e293b;
        border: 2px solid #38bdf8;
        border-radius: 12px;
        padding: 24px;
        width: 100%;
        max-width: 320px;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
        color: #f1f5f9;
        display: flex;
        flex-direction: column;
        gap: 16px;
      ">
        <h2 style="margin: 0; font-size: 16px; text-align: center; color: #38bdf8; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Connect to Host</h2>
        <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5; text-align: center;">
          Enter the IP address of your friend's local hotspot to join their world.
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <label style="font-size: 10px; color: #38bdf8; font-weight: bold; text-transform: uppercase;">Host IP / Address:</label>
          <input id="connect-host-input" type="text" value="${lastHost}" placeholder="e.g. 192.168.43.1" style="
            background: #0f172a;
            border: 1px solid #475569;
            border-radius: 6px;
            padding: 10px;
            color: #ffffff;
            font-family: monospace;
            font-size: 13px;
            outline: none;
            width: 100%;
            box-sizing: border-box;
          "/>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 4px;">
          <button id="connect-modal-cancel" style="
            flex: 1;
            background: #475569;
            border: none;
            border-radius: 6px;
            padding: 10px;
            color: #ffffff;
            font-family: monospace;
            font-size: 11px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.15s;
          ">CANCEL</button>
          <button id="connect-modal-save" style="
            flex: 1;
            background: #0284c7;
            border: none;
            border-radius: 6px;
            padding: 10px;
            color: #ffffff;
            font-family: monospace;
            font-size: 11px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.15s;
          ">CONNECT</button>
        </div>
      </div>
    `;

    const app = document.getElementById('app') || document.body;
    app.appendChild(modal);

    const input = document.getElementById('connect-host-input') as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }

    const closeModal = () => {
      modal.remove();
      this.update = prevUpdate; // restore update loop
      if (this.audioManager) this.audioManager.playSFX('cancel');
    };

    document.getElementById('connect-modal-cancel')?.addEventListener('click', closeModal);
    
    document.getElementById('connect-modal-save')?.addEventListener('click', () => {
      const host = input?.value?.trim();
      if (host) {
        localStorage.setItem('poketer_last_host', host);
        if (this.networkClient) {
          this.networkClient.setHost(host);
          this.networkClient.disconnect();
          this.networkClient.connect();
        }
        
        // Show connect toast / confirmation
        const overlayDiv = document.createElement('div');
        overlayDiv.style.position = 'absolute';
        overlayDiv.style.bottom = '20px';
        overlayDiv.style.left = '50%';
        overlayDiv.style.transform = 'translateX(-50%)';
        overlayDiv.style.background = '#0284c7';
        overlayDiv.style.border = '1px solid #38bdf8';
        overlayDiv.style.color = '#fff';
        overlayDiv.style.padding = '8px 16px';
        overlayDiv.style.borderRadius = '20px';
        overlayDiv.style.fontSize = '11px';
        overlayDiv.style.zIndex = '300';
        overlayDiv.innerText = `Connecting to ${host}...`;
        app.appendChild(overlayDiv);

        setTimeout(() => {
          overlayDiv.remove();
        }, 3000);
      }
      closeModal();
    });
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