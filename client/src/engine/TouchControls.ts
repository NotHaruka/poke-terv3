import { InputManager } from './InputManager.js';

export class TouchControls {
  private container: HTMLElement;
  private inputManager: InputManager;
  private overlay: HTMLDivElement | null = null;
  private joystickActive = false;
  private joystickTouchId: number | null = null;
  private joystickCenter = { x: 0, y: 0 };
  private maxRadius = 40; // max knob distance in px

  // Simulated keys currently held down
  private activeSimulatedDirections: Set<string> = new Set();

  constructor(container: HTMLElement, inputManager: InputManager) {
    this.container = container;
    this.inputManager = inputManager;

    // Listen for touch detection from InputManager
    window.addEventListener('touch-detected', this.show);
    window.addEventListener('touch-changed', (e: any) => {
      if (e.detail?.active) {
        this.show();
      } else {
        this.hide();
      }
    });

    // If InputManager already detected touch
    if (this.inputManager.isTouchActive()) {
      this.show();
    }
  }

  private show = (): void => {
    if (this.overlay) return; // Already showing

    // Create the overlay container
    this.overlay = document.createElement('div');
    this.overlay.id = 'touch-overlay';
    this.overlay.style.position = 'absolute';
    this.overlay.style.inset = '0';
    this.overlay.style.pointerEvents = 'none';
    this.overlay.style.userSelect = 'none';
    this.overlay.style.webkitUserSelect = 'none';
    this.overlay.style.zIndex = '100';
    this.overlay.style.display = 'flex';
    this.overlay.style.flexDirection = 'column';
    this.overlay.style.justifyContent = 'flex-end';
    this.overlay.style.padding = '24px';

    // HTML Structure for Joystick and Buttons
    this.overlay.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%; pointer-events: none;">
        <!-- Left Side: Joystick -->
        <div id="touch-joystick-base" style="
          width: 100px;
          height: 100px;
          background: rgba(30, 41, 59, 0.45);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          border: 2px solid rgba(255, 255, 255, 0.25);
          border-radius: 50%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: auto;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
          touch-action: none;
        ">
          <!-- Joystick Knob -->
          <div id="touch-joystick-knob" style="
            width: 44px;
            height: 44px;
            background: radial-gradient(circle, #f8fafc 0%, #cbd5e1 100%);
            border-radius: 50%;
            box-shadow: 0 4px 10px rgba(0,0,0,0.4), inset 0 2px 4px #ffffff;
            transition: transform 0.05s ease-out;
            pointer-events: none;
          "></div>
        </div>

        <!-- Right Side: Action Buttons -->
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 16px; pointer-events: none;">
          <!-- Menu Button (Top) -->
          <div id="touch-btn-menu" style="
            width: 46px;
            height: 46px;
            background: rgba(71, 85, 105, 0.85);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-family: monospace;
            font-size: 11px;
            font-weight: bold;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            pointer-events: auto;
            touch-action: none;
            cursor: pointer;
            transition: transform 0.1s ease;
          ">MENU</div>

          <!-- A/B Layout (Standard console layout) -->
          <div style="display: flex; gap: 16px; pointer-events: none;">
            <!-- B Button -->
            <div id="touch-btn-b" style="
              width: 54px;
              height: 54px;
              background: rgba(239, 68, 68, 0.85);
              backdrop-filter: blur(4px);
              -webkit-backdrop-filter: blur(4px);
              border: 2px solid rgba(255, 255, 255, 0.3);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-family: system-ui, sans-serif;
              font-size: 18px;
              font-weight: 800;
              text-shadow: 0 1px 2px rgba(0,0,0,0.5);
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              pointer-events: auto;
              touch-action: none;
              cursor: pointer;
              transition: transform 0.1s ease;
            ">B</div>

            <!-- A Button -->
            <div id="touch-btn-a" style="
              width: 58px;
              height: 58px;
              background: rgba(16, 185, 129, 0.85);
              backdrop-filter: blur(4px);
              -webkit-backdrop-filter: blur(4px);
              border: 2px solid rgba(255, 255, 255, 0.3);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-family: system-ui, sans-serif;
              font-size: 20px;
              font-weight: 800;
              text-shadow: 0 1px 2px rgba(0,0,0,0.5);
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              pointer-events: auto;
              touch-action: none;
              cursor: pointer;
              transition: transform 0.1s ease;
            ">A</div>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.overlay);

    this.setupJoystickEvents();
    this.setupButtonEvents('touch-btn-a', 'Enter');
    this.setupButtonEvents('touch-btn-b', 'Escape');
    this.setupButtonEvents('touch-btn-menu', 'KeyE');
  };

  private hide = (): void => {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  };

  private setupJoystickEvents(): void {
    const base = document.getElementById('touch-joystick-base');
    const knob = document.getElementById('touch-joystick-knob');
    if (!base || !knob) return;

    const handleStart = (e: TouchEvent) => {
      e.preventDefault();
      const rect = base.getBoundingClientRect();
      this.joystickCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      
      const touch = e.changedTouches[0];
      this.joystickTouchId = touch.identifier;
      this.joystickActive = true;
      this.processJoystickMovement(touch.clientX, touch.clientY, knob);
    };

    const handleMove = (e: TouchEvent) => {
      if (!this.joystickActive || this.joystickTouchId === null) return;
      e.preventDefault();

      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this.joystickTouchId) {
          const touch = e.touches[i];
          this.processJoystickMovement(touch.clientX, touch.clientY, knob);
          break;
        }
      }
    };

    const handleEnd = (e: TouchEvent) => {
      if (!this.joystickActive || this.joystickTouchId === null) return;
      
      let touchEnded = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          touchEnded = true;
          break;
        }
      }

      if (touchEnded) {
        this.joystickActive = false;
        this.joystickTouchId = null;
        knob.style.transform = 'translate(0px, 0px)';
        
        // Release all direction keys
        for (const key of this.activeSimulatedDirections) {
          this.inputManager.simulateKeyUp(key);
        }
        this.activeSimulatedDirections.clear();
      }
    };

    base.addEventListener('touchstart', handleStart as any, { passive: false });
    window.addEventListener('touchmove', handleMove as any, { passive: false });
    window.addEventListener('touchend', handleEnd as any, { passive: false });
    window.addEventListener('touchcancel', handleEnd as any, { passive: false });
  }

  private processJoystickMovement(clientX: number, clientY: number, knob: HTMLElement): void {
    const dx = clientX - this.joystickCenter.x;
    const dy = clientY - this.joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let knobX = dx;
    let knobY = dy;

    if (dist > this.maxRadius) {
      knobX = (dx / dist) * this.maxRadius;
      knobY = (dy / dist) * this.maxRadius;
    }

    knob.style.transform = `translate(${knobX}px, ${knobY}px)`;

    // Map to keyboard directional keys (ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
    const threshold = this.maxRadius * 0.3; // 12px threshold
    const keysToHold: string[] = [];

    if (knobX > threshold) {
      keysToHold.push('ArrowRight');
    } else if (knobX < -threshold) {
      keysToHold.push('ArrowLeft');
    }

    if (knobY > threshold) {
      keysToHold.push('ArrowDown');
    } else if (knobY < -threshold) {
      keysToHold.push('ArrowUp');
    }

    const directionKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

    // For any keys that are no longer held, release them
    for (const key of directionKeys) {
      if (!keysToHold.includes(key) && this.activeSimulatedDirections.has(key)) {
        this.inputManager.simulateKeyUp(key);
        this.activeSimulatedDirections.delete(key);
      }
    }

    // For any new keys, press them
    for (const key of keysToHold) {
      if (!this.activeSimulatedDirections.has(key)) {
        this.inputManager.simulateKeyDown(key);
        this.activeSimulatedDirections.add(key);
      }
    }
  }

  private setupButtonEvents(elementId: string, keyCode: string): void {
    const btn = document.getElementById(elementId);
    if (!btn) return;

    const press = (e: TouchEvent) => {
      e.preventDefault();
      btn.style.transform = 'scale(0.85)';
      this.inputManager.simulateKeyDown(keyCode);
    };

    const release = (e: TouchEvent) => {
      e.preventDefault();
      btn.style.transform = 'scale(1)';
      this.inputManager.simulateKeyUp(keyCode);
    };

    btn.addEventListener('touchstart', press as any, { passive: false });
    btn.addEventListener('touchend', release as any, { passive: false });
    btn.addEventListener('touchcancel', release as any, { passive: false });
  }
}
