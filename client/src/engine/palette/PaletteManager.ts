/** Palette Manager handling runtime color swaps, image recoloring, and cached offscreen canvases */

export type ColorReplacementMap = Record<string, string>; // hex source -> hex replacement

export class PaletteManager {
  private static instance: PaletteManager;
  private canvasCache = new Map<string, HTMLCanvasElement>();

  static getInstance(): PaletteManager {
    if (!this.instance) {
      this.instance = new PaletteManager();
    }
    return this.instance;
  }

  /** Normalizes a hex string or RGB string to #rrggbb format */
  static normalizeHex(color: string): string {
    if (!color) return '#000000';
    if (color.startsWith('#')) {
      if (color.length === 4) {
        return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toLowerCase();
      }
      return color.toLowerCase();
    }
    return color.toLowerCase();
  }

  /** Recolors an image/canvas by replacing exact source colors with target colors */
  recolorCanvas(
    source: HTMLImageElement | HTMLCanvasElement,
    colorMap: ColorReplacementMap,
    cacheKey?: string
  ): HTMLCanvasElement {
    if (cacheKey && this.canvasCache.has(cacheKey)) {
      return this.canvasCache.get(cacheKey)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = source.width || 16;
    canvas.height = source.height || 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.drawImage(source, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Convert colorMap to RGBA numbers
    const parsedMap: { r: number; g: number; b: number; targetR: number; targetG: number; targetB: number }[] = [];
    for (const [srcHex, targetHex] of Object.entries(colorMap)) {
      const srcRGB = this.hexToRgb(srcHex);
      const dstRGB = this.hexToRgb(targetHex);
      if (srcRGB && dstRGB) {
        parsedMap.push({
          r: srcRGB.r, g: srcRGB.g, b: srcRGB.b,
          targetR: dstRGB.r, targetG: dstRGB.g, targetB: dstRGB.b,
        });
      }
    }

    // Process pixels
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue; // Skip transparent

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      for (let j = 0; j < parsedMap.length; j++) {
        const item = parsedMap[j];
        if (Math.abs(r - item.r) <= 2 && Math.abs(g - item.g) <= 2 && Math.abs(b - item.b) <= 2) {
          data[i] = item.targetR;
          data[i + 1] = item.targetG;
          data[i + 2] = item.targetB;
          break;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    if (cacheKey) {
      this.canvasCache.set(cacheKey, canvas);
    }

    return canvas;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const clean = PaletteManager.normalizeHex(hex);
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(clean);
    return match ? {
      r: parseInt(match[1], 16),
      g: parseInt(match[2], 16),
      b: parseInt(match[3], 16),
    } : null;
  }

  /** Clears the recolored canvas cache */
  clearCache(): void {
    this.canvasCache.clear();
  }
}
