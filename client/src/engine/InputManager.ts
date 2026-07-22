/** Keyboard and gamepad input manager */

export interface InputState {
  keys: ReadonlySet<string>;
  pressedKeys: ReadonlySet<string>;
  releasedKeys: ReadonlySet<string>;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private _justPressed: Set<string> = new Set();
  private _justReleased: Set<string> = new Set();
  private prevKeys: Set<string> = new Set();
  private attachedElement: HTMLElement | null = null;

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.keys.has(e.code)) {
      this._justPressed.add(e.code);
    }
    this.keys.add(e.code);

    // Prevent default for game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Escape'].includes(e.code)) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
    this._justReleased.add(e.code);

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Escape'].includes(e.code)) {
      e.preventDefault();
    }
  };

  private onBlur = (): void => {
    // Clear all keys when window loses focus
    for (const key of this.keys) {
      this._justReleased.add(key);
    }
    this.keys.clear();
  };

  /** Attach input listeners to window */
  attach(element: HTMLElement): void {
    this.detach();
    this.attachedElement = element;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  /** Detach input listeners */
  detach(element?: HTMLElement): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.attachedElement = null;
  }

  /** Call once per frame to update justPressed/justReleased states */
  update(): void {
    this._justPressed.clear();
    this._justReleased.clear();
  }

  /** Consume an input so it is no longer processed this frame */
  consume(code: string): void {
    this.keys.delete(code);
    this._justPressed.delete(code);
    this._justReleased.delete(code);
  }

  /** Check if a key is currently held down */
  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  /** Check if a key was just pressed this frame */
  justPressed(code: string): boolean {
    return this._justPressed.has(code);
  }

  /** Check if a key was just released this frame */
  justReleased(code: string): boolean {
    return this._justReleased.has(code);
  }

  /** Check if any direction key is pressed */
  isMoving(): boolean {
    return (
      this.keys.has('ArrowUp') || this.keys.has('KeyW') ||
      this.keys.has('ArrowDown') || this.keys.has('KeyS') ||
      this.keys.has('ArrowLeft') || this.keys.has('KeyA') ||
      this.keys.has('ArrowRight') || this.keys.has('KeyD')
    );
  }

  /** Get the current movement direction based on held keys */
  getDirection(): string {
    let x = 0, y = 0;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) y -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) y += 1;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) x -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) x += 1;

    if (x === 0 && y === 0) return '';
    if (x === 0 && y < 0) return 'up';
    if (x === 0 && y > 0) return 'down';
    if (x < 0 && y === 0) return 'left';
    if (x > 0 && y === 0) return 'right';
    if (x < 0 && y < 0) return 'up-left';
    if (x > 0 && y < 0) return 'up-right';
    if (x < 0 && y > 0) return 'down-left';
    if (x > 0 && y > 0) return 'down-right';
    return '';
  }

  /** Check if the confirm key (Enter or Space) was pressed */
  isConfirm(): boolean {
    return this._justPressed.has('Enter') || this._justPressed.has('Space');
  }

  /** Check if the cancel key (Escape) was pressed */
  isCancel(): boolean {
    return this._justPressed.has('Escape');
  }

  /** Check if shift is held */
  isShiftHeld(): boolean {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  /** Get a snapshot of current input state */
  getState(): InputState {
    return {
      keys: new Set(this.keys),
      pressedKeys: new Set(this._justPressed),
      releasedKeys: new Set(this._justReleased),
    };
  }

  /** Get all currently pressed keys as a Record<string, boolean> for networking */
  getKeysRecord(): Record<string, boolean> {
    const record: Record<string, boolean> = {};
    for (const key of this.keys) {
      record[key] = true;
    }
    return record;
  }
}