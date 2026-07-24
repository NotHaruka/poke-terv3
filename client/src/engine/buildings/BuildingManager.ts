/**
 * BuildingManager handles placement, collisions, entrance detection,
 * and animated updates for all overworld buildings.
 */

import { BuildingInstance, BuildingDefinition } from './BuildingDefinition.js';
import { BuildingRegistry } from '../registries/BuildingRegistry.js';
import { CollisionSystem, Collider } from '../physics/Collision.js';
import { BuildingRenderer } from '../renderer/BuildingRenderer.js';
import { isTownChunk, hash2D } from 'poke-ter-shared';

export class BuildingManager {
  private instances: BuildingInstance[] = [];
  private colliders: Collider[] = [];
  private collisionSystem: CollisionSystem;
  public currentMapId: string = 'city';
  public currentSeed: number = 0;

  constructor(collisionSystem: CollisionSystem) {
    this.collisionSystem = collisionSystem;
    this.loadMapBuildings(this.currentMapId, this.currentSeed);
  }

  public setMap(mapId: string, seed: number = 0): void {
    if (this.currentMapId === mapId && this.currentSeed === seed && this.instances.length > 0) return;
    this.currentMapId = mapId;
    this.currentSeed = seed;
    this.clear();
    this.loadMapBuildings(mapId, seed);
  }

  /** Initialize default building placements for each overworld map */
  private loadMapBuildings(mapId: string, seed: number = 0): void {
    if (mapId === 'city') {
      // NW Block
      this.addBuilding('manor_1', 'manor', 'city', 110, 98);
      this.addBuilding('library_1', 'library', 'city', 107, 110);
      this.addBuilding('pokecenter_1', 'pokecenter', 'city', 116, 110);

      // NE Block
      this.addBuilding('lakeview_1', 'house_small', 'city', 140, 98, 'Lakeview Cottage');
      this.addBuilding('pokemart_1', 'pokemart', 'city', 133, 110);
      this.addBuilding('boutique_1', 'boutique', 'city', 142, 110);

      // SW Block
      this.addBuilding('warehouse_1', 'warehouse', 'city', 108, 128);
      this.addBuilding('inn_1', 'inn', 'city', 116, 128);
      
      // SE Block
      this.addBuilding('lab_1', 'lab', 'city', 133, 128);
      this.addBuilding('collector_1', 'collector', 'city', 142, 128);
      this.addBuilding('ranger_1', 'ranger_station', 'city', 138, 138);
    } else if (mapId.startsWith('route_')) {
      // 1. Static Route Landmark & Outpost Buildings
      if (mapId === 'route_1') {
        this.addBuilding('windmill_1', 'windmill', 'route_1', 112, 108);
        this.addBuilding('ranger_route1', 'ranger_station', 'route_1', 135, 115);
        this.addBuilding('house_route1', 'house_small', 'route_1', 110, 118, 'Route Rest Stop');
        this.addBuilding('pokemart_route1', 'pokemart', 'route_1', 120, 110);
      } else if (mapId === 'route_2') {
        this.addBuilding('inn_route2', 'inn', 'route_2', 145, 122);
        this.addBuilding('warehouse_route2', 'warehouse', 'route_2', 120, 140);
        this.addBuilding('house_route2', 'house_small', 'route_2', 135, 130, 'Lakeside Lodge');
        this.addBuilding('collector_route2', 'collector', 'route_2', 152, 115);
      } else if (mapId === 'route_3') {
        this.addBuilding('lab_route3', 'lab', 'route_3', 124, 84);
        this.addBuilding('boutique_route3', 'boutique', 'route_3', 138, 84);
        this.addBuilding('house_route3', 'house_small', 'route_3', 118, 92, 'Mountain Cabin');
      } else if (mapId === 'route_4') {
        this.addBuilding('house_route4', 'house_small', 'route_4', 115, 138, 'Outpost Haven');
        this.addBuilding('pokecenter_route4', 'pokecenter', 'route_4', 98, 138);
        this.addBuilding('library_route4', 'library', 'route_4', 122, 148);
      }

      // 2. Procedural Route Town Sprite Buildings
      if (seed !== 0) {
        for (let cx = 0; cx < 16; cx++) {
          for (let cy = 0; cy < 16; cy++) {
            if (isTownChunk(cx, cy, seed)) {
              const gx0 = cx * 16;
              const gy0 = cy * 16;
              const townHash = hash2D(cx, cy, seed + 12000);
              const townType = Math.floor(townHash * 3);

              if (townType === 0) {
                // Lakeside Town: Pokémon Center & Traveler's Inn
                this.addBuilding(`town_${cx}_${cy}_1`, 'pokecenter', mapId, gx0 + 1, gy0 + 2);
                this.addBuilding(`town_${cx}_${cy}_2`, 'inn', mapId, gx0 + 1, gy0 + 9);
              } else if (townType === 1) {
                // Forest Grove Town: Ranger Station & Cozy Cottage
                this.addBuilding(`town_${cx}_${cy}_1`, 'ranger_station', mapId, gx0 + 1, gy0 + 2);
                this.addBuilding(`town_${cx}_${cy}_2`, 'house_small', mapId, gx0 + 9, gy0 + 2, 'Forest Cottage');
              } else {
                // Summit Mining Camp: Research Lab & Pokémon Mart
                this.addBuilding(`town_${cx}_${cy}_1`, 'lab', mapId, gx0 + 1, gy0 + 2);
                this.addBuilding(`town_${cx}_${cy}_2`, 'pokemart', mapId, gx0 + 9, gy0 + 8);
              }
            }
          }
        }
      }
    }
  }

  public addBuilding(
    instanceId: string,
    definitionId: string,
    mapId: string,
    tileX: number,
    tileY: number,
    customName?: string
  ): void {
    const def = BuildingRegistry.get(definitionId);
    if (!def) return;

    const inst: BuildingInstance = {
      instanceId,
      definitionId,
      mapId,
      tileX,
      tileY,
      customName,
    };

    this.instances.push(inst);
    this.addBuildingColliders(inst, def);
  }

  /**
   * Generates solid wall colliders for the building footprint,
   * EXCLUDING the single entrance tile doorway.
   */
  private addBuildingColliders(inst: BuildingInstance, def: BuildingDefinition): void {
    const doorTileX = inst.tileX + def.doorOffsetX;
    const doorTileY = inst.tileY + def.doorOffsetY;

    for (let ty = 0; ty < def.heightTiles; ty++) {
      for (let tx = 0; tx < def.widthTiles; tx++) {
        const gx = inst.tileX + tx;
        const gy = inst.tileY + ty;

        // Skip doorway entrance tile so player can walk into it!
        if (gx === doorTileX && gy === doorTileY) {
          continue;
        }

        const collider: Collider = {
          x: gx * 16,
          y: gy * 16,
          width: 16,
          height: 16,
          solid: true,
          group: 'building_wall',
        };

        this.colliders.push(collider);
        this.collisionSystem.add(collider);
      }
    }
  }

  /** Check if a tile coordinate is the entrance tile of any building in the map */
  public getEntranceAt(gx: number, gy: number): {
    building: BuildingInstance;
    definition: BuildingDefinition;
  } | null {
    for (const inst of this.instances) {
      const def = BuildingRegistry.get(inst.definitionId);
      if (!def) continue;

      const doorGx = inst.tileX + def.doorOffsetX;
      const doorGy = inst.tileY + def.doorOffsetY;

      if (gx === doorGx && gy === doorGy) {
        return { building: inst, definition: def };
      }
    }
    return null;
  }

  /** Get building for interior ID */
  public getBuildingForInterior(interiorMapId: string): {
    building: BuildingInstance;
    definition: BuildingDefinition;
  } | null {
    const baseId = interiorMapId.includes(':') ? interiorMapId.split(':')[1] : interiorMapId;
    for (const inst of this.instances) {
      const def = BuildingRegistry.get(inst.definitionId);
      if (!def) continue;

      if (def.interiorMapId === baseId) {
        return { building: inst, definition: def };
      }
    }
    return null;
  }

  /** Get building at tile coordinate */
  public getBuildingAt(gx: number, gy: number): {
    building: BuildingInstance;
    definition: BuildingDefinition;
  } | null {
    for (const inst of this.instances) {
      const def = BuildingRegistry.get(inst.definitionId);
      if (!def) continue;

      if (
        gx >= inst.tileX &&
        gx < inst.tileX + def.widthTiles &&
        gy >= inst.tileY &&
        gy < inst.tileY + def.heightTiles
      ) {
        return { building: inst, definition: def };
      }
    }
    return null;
  }

  public update(dt: number): void {
    BuildingRenderer.update(dt);
  }

  /** Returns all drawables for depth-sorted rendering in OverworldScene */
  public getDrawables(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): Array<{
    sortY: number;
    draw: () => void;
  }> {
    const drawables: Array<{
      sortY: number;
      draw: () => void;
    }> = [];

    for (const inst of this.instances) {
      const def = BuildingRegistry.get(inst.definitionId);
      if (!def) continue;

      const worldX = inst.tileX * 16;
      const worldY = inst.tileY * 16;
      const screenX = Math.round(worldX - offsetX);
      const screenY = Math.round(worldY - offsetY);

      const w = def.widthTiles * 16;
      const h = def.heightTiles * 16;

      // Culling check
      if (screenX + w < -32 || screenX > 320 + 32) continue;
      if (screenY + h < -32 || screenY > 240 + 32) continue;

      // Bottom Y coordinate for depth sorting (Y-sort)
      const sortY = worldY + h;

      drawables.push({
        sortY,
        draw: () => {
          BuildingRenderer.renderBuilding(ctx, inst.definitionId, screenX, screenY, inst.customName);
        },
      });
    }

    return drawables;
  }

  public clear(): void {
    for (const c of this.colliders) {
      this.collisionSystem.remove(c);
    }
    this.colliders = [];
    this.instances = [];
  }
}
