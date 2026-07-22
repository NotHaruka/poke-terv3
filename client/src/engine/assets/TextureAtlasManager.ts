/** Texture Atlas & Asset Caching Manager with procedural fallback sprite generation */

export interface AtlasRegion {
  id: string;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  pivotX?: number;
  pivotY?: number;
}

export class TextureAtlasManager {
  private static instance: TextureAtlasManager;
  private atlases = new Map<string, HTMLImageElement | HTMLCanvasElement>();
  private regions = new Map<string, { atlasKey: string; region: AtlasRegion }>();
  private proceduralCache = new Map<string, HTMLCanvasElement>();

  static getInstance(): TextureAtlasManager {
    if (!this.instance) {
      this.instance = new TextureAtlasManager();
    }
    return this.instance;
  }

  registerAtlas(atlasKey: string, image: HTMLImageElement | HTMLCanvasElement): void {
    this.atlases.set(atlasKey, image);
  }

  registerRegion(atlasKey: string, region: AtlasRegion): void {
    this.regions.set(region.id, { atlasKey, region });
  }

  getRegion(regionId: string): { image: HTMLImageElement | HTMLCanvasElement; region: AtlasRegion } | null {
    const entry = this.regions.get(regionId);
    if (!entry) return null;
    const atlas = this.atlases.get(entry.atlasKey);
    if (!atlas) return null;
    return { image: atlas, region: entry.region };
  }

  /**
   * Generates or retrieves a procedural pixel art canvas for a given sprite key.
   * Ensures that even before image files finish downloading or if assets are missing,
   * every single sprite, cosmetic, building, or UI element renders crisp pixel art.
   */
  getProceduralSprite(key: string, width = 16, height = 16, drawFn?: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
    if (this.proceduralCache.has(key)) {
      return this.proceduralCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    if (drawFn) {
      drawFn(ctx);
    } else {
      // Default procedural grid pattern
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width / 2, height / 2);
      ctx.fillRect(width / 2, height / 2, width / 2, height / 2);
    }

    this.proceduralCache.set(key, canvas);
    return canvas;
  }

  clearMemory(): void {
    this.proceduralCache.clear();
  }
}
