/**
 * InteriorManager controls on-demand interior loading, caching, memory management,
 * collision creation, and exit trigger checks.
 */

import { InteriorDefinition, FurnitureItem } from './InteriorDefinition.js';
import { InteriorRegistry } from './InteriorRegistry.js';
import { CollisionSystem, Collider } from '../Collision.js';
import { InteriorRenderer } from '../rendering/InteriorRenderer.js';

export class InteriorManager {
  private activeInterior: InteriorDefinition | null = null;
  private cache = new Map<string, InteriorDefinition>();
  private maxCacheSize: number = 10;
  private colliders: Collider[] = [];
  private collisionSystem: CollisionSystem;

  constructor(collisionSystem: CollisionSystem) {
    this.collisionSystem = collisionSystem;
  }

  /** Load an interior on demand with caching */
  public loadInterior(interiorId: string): InteriorDefinition | null {
    if (this.activeInterior?.interiorId === interiorId) {
      return this.activeInterior;
    }

    // Check cache
    if (this.cache.has(interiorId)) {
      const cached = this.cache.get(interiorId)!;
      this.setActiveInterior(cached);
      return cached;
    }

    // Retrieve from registry
    const def = InteriorRegistry.get(interiorId);
    if (!def) {
      console.warn(`[InteriorManager] Interior ID not found: ${interiorId}`);
      return null;
    }

    // Store in LRU cache
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(interiorId, def);

    this.setActiveInterior(def);
    return def;
  }

  private setActiveInterior(def: InteriorDefinition): void {
    this.clearColliders();
    this.activeInterior = def;
    this.createInteriorColliders(def);
  }

  /**
   * Generates solid colliders for interior boundary walls, counters,
   * tables, PCs, and solid furniture objects.
   */
  private createInteriorColliders(def: InteriorDefinition): void {
    // 1. Boundary Wall Colliders
    for (let ty = 0; ty < def.heightTiles; ty++) {
      for (let tx = 0; tx < def.widthTiles; tx++) {
        const tileId = def.tilemap[ty][tx];

        // Wall or Void tiles are solid (0 = void/wall, 5 = wall wallpaper)
        // EXCEPT exit doormat tile (ID 4)
        if ((tileId === 0 || tileId === 5) && !(tx === def.exitTile.tileX && ty === def.exitTile.tileY)) {
          const collider: Collider = {
            x: tx * 16,
            y: ty * 16,
            width: 16,
            height: 16,
            solid: true,
            group: 'interior_wall',
          };
          this.colliders.push(collider);
          this.collisionSystem.add(collider);
        }
      }
    }

    // 2. Furniture Colliders
    for (const item of def.furniture) {
      if (!item.solid) continue;

      for (let fty = 0; fty < item.heightTiles; fty++) {
        for (let ftx = 0; ftx < item.widthTiles; ftx++) {
          const gx = item.tileX + ftx;
          const gy = item.tileY + fty;

          const collider: Collider = {
            x: gx * 16,
            y: gy * 16,
            width: 16,
            height: 16,
            solid: true,
            group: 'interior_furniture',
          };
          this.colliders.push(collider);
          this.collisionSystem.add(collider);
        }
      }
    }
  }

  /** Check if a tile coordinate is the exit tile of the active interior */
  public isExitTile(gx: number, gy: number): boolean {
    if (!this.activeInterior) return false;
    return gx === this.activeInterior.exitTile.tileX && gy === this.activeInterior.exitTile.tileY;
  }

  /** Check if a position interacts with a solid furniture object */
  public getInteractableFurniture(gx: number, gy: number): FurnitureItem | null {
    if (!this.activeInterior) return null;

    for (const item of this.activeInterior.furniture) {
      if (!item.interactable) continue;

      if (
        gx >= item.tileX &&
        gx < item.tileX + item.widthTiles &&
        gy >= item.tileY &&
        gy < item.tileY + item.heightTiles
      ) {
        return item;
      }
    }
    return null;
  }

  public getActiveInterior(): InteriorDefinition | null {
    return this.activeInterior;
  }

  public update(dt: number): void {
    InteriorRenderer.update(dt);
  }

  public render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
    if (!this.activeInterior) return;
    InteriorRenderer.renderInterior(ctx, this.activeInterior, offsetX, offsetY);
  }

  public unloadCurrent(): void {
    this.clearColliders();
    this.activeInterior = null;
  }

  private clearColliders(): void {
    for (const c of this.colliders) {
      this.collisionSystem.remove(c);
    }
    this.colliders = [];
  }

  public clear(): void {
    this.unloadCurrent();
    this.cache.clear();
  }
}
