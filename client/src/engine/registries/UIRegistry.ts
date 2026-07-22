/** Registry for UI frames, 9-slice definitions, icons, status bars, and cursors */

export interface NineSliceFrame {
  id: string;
  bgColor: string;
  borderColor: string;
  accentColor: string;
  shadowColor: string;
  borderWidth: number;
}

export class UIRegistry {
  private static frames = new Map<string, NineSliceFrame>([
    ['default_window', {
      id: 'default_window',
      bgColor: 'rgba(15, 20, 35, 0.92)',
      borderColor: '#4deeea',
      accentColor: '#ffe600',
      shadowColor: 'rgba(0, 0, 0, 0.6)',
      borderWidth: 2,
    }],
    ['dialogue_box', {
      id: 'dialogue_box',
      bgColor: 'rgba(10, 15, 30, 0.95)',
      borderColor: '#3a8be8',
      accentColor: '#ffffff',
      shadowColor: 'rgba(0, 0, 0, 0.8)',
      borderWidth: 2,
    }],
    ['menu_card', {
      id: 'menu_card',
      bgColor: 'rgba(20, 25, 45, 0.95)',
      borderColor: '#f1c40f',
      accentColor: '#ffffff',
      shadowColor: 'rgba(0, 0, 0, 0.7)',
      borderWidth: 2,
    }],
    ['battle_hud', {
      id: 'battle_hud',
      bgColor: 'rgba(5, 10, 20, 0.90)',
      borderColor: '#2ecc71',
      accentColor: '#e74c3c',
      shadowColor: 'rgba(0, 0, 0, 0.9)',
      borderWidth: 2,
    }],
  ]);

  static getFrame(id: string): NineSliceFrame {
    return this.frames.get(id) || this.frames.get('default_window')!;
  }

  static registerFrame(frame: NineSliceFrame): void {
    this.frames.set(frame.id, frame);
  }
}
