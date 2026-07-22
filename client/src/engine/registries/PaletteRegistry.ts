/** Centralized registry for master color palettes, ramps, and seasonal variants */

export interface ColorRamp {
  base: string;
  light: string;
  dark: string;
  highlight?: string;
  shadow?: string;
}

export class PaletteRegistry {
  private static hairPalettes = new Map<string, ColorRamp>([
    ['black', { base: '#222222', light: '#444444', dark: '#111111', shadow: '#050505' }],
    ['brown', { base: '#5c3a21', light: '#805030', dark: '#3b2313', shadow: '#24140a' }],
    ['blonde', { base: '#e2b810', light: '#f7d84d', dark: '#b08f0a', shadow: '#7a6305' }],
    ['red', { base: '#cc2222', light: '#ee4444', dark: '#991111', shadow: '#660000' }],
    ['white', { base: '#e8e8e8', light: '#ffffff', dark: '#b8b8b8', shadow: '#888888' }],
    ['blue', { base: '#2575fc', light: '#6a11cb', dark: '#1a52b8', shadow: '#103375' }],
    ['green', { base: '#28a745', light: '#5dd87a', dark: '#1a6f2e', shadow: '#0e401a' }],
    ['purple', { base: '#8e44ad', light: '#b862e0', dark: '#612a78', shadow: '#3c184c' }],
    ['pink', { base: '#ff69b4', light: '#ff94ce', dark: '#c73b85', shadow: '#8c205a' }],
    ['silver', { base: '#bdc3c7', light: '#ecf0f1', dark: '#7f8c8d', shadow: '#2c3e50' }],
  ]);

  private static skinPalettes = new Map<string, ColorRamp>([
    ['light', { base: '#ffccaa', light: '#ffe2cc', dark: '#e5a073', shadow: '#be7850' }],
    ['fair', { base: '#f1c27d', light: '#f9d8a5', dark: '#c68642', shadow: '#9e622b' }],
    ['tan', { base: '#e5a073', light: '#f0be99', dark: '#b8754b', shadow: '#8b502e' }],
    ['dark', { base: '#8d5524', light: '#a66832', dark: '#633914', shadow: '#402209' }],
    ['deep', { base: '#583212', light: '#73431b', dark: '#3b2009', shadow: '#241203' }],
    ['olive', { base: '#c68642', light: '#dca463', dark: '#9e622b', shadow: '#754519' }],
  ]);

  private static eyePalettes = new Map<string, string>([
    ['black', '#000000'],
    ['blue', '#1155cc'],
    ['green', '#228822'],
    ['brown', '#5c3a21'],
    ['amber', '#ff9900'],
    ['red', '#cc1111'],
    ['violet', '#8e44ad'],
  ]);

  private static clothPalettes = new Map<string, ColorRamp>([
    ['blue', { base: '#3a8be8', light: '#6cb2ff', dark: '#1e5b9e', shadow: '#123863' }],
    ['red', { base: '#cc2222', light: '#ee4444', dark: '#991111', shadow: '#660000' }],
    ['green', { base: '#22cc22', light: '#55ee55', dark: '#119911', shadow: '#006600' }],
    ['white', { base: '#eeeeee', light: '#ffffff', dark: '#cccccc', shadow: '#999999' }],
    ['black', { base: '#222222', light: '#444444', dark: '#111111', shadow: '#050505' }],
    ['yellow', { base: '#f1c40f', light: '#f39c12', dark: '#d35400', shadow: '#962d00' }],
    ['purple', { base: '#9b59b6', light: '#be90d4', dark: '#8e44ad', shadow: '#5e2d73' }],
    ['orange', { base: '#e67e22', light: '#f39c12', dark: '#d35400', shadow: '#903500' }],
    ['cyan', { base: '#00d2d3', light: '#54a0ff', dark: '#01a3a4', shadow: '#006266' }],
    ['pink', { base: '#ff6b6b', light: '#ff8e8e', dark: '#ee5253', shadow: '#b33939' }],
  ]);

  static getHairRamp(id: string): ColorRamp {
    return this.hairPalettes.get(id.toLowerCase()) || {
      base: id, light: id, dark: id, shadow: id
    };
  }

  static getSkinRamp(id: string): ColorRamp {
    return this.skinPalettes.get(id.toLowerCase()) || {
      base: id, light: id, dark: id, shadow: id
    };
  }

  static getEyeColor(id: string): string {
    return this.eyePalettes.get(id.toLowerCase()) || id;
  }

  static getClothRamp(id: string): ColorRamp {
    return this.clothPalettes.get(id.toLowerCase()) || {
      base: id, light: id, dark: id, shadow: id
    };
  }
}
