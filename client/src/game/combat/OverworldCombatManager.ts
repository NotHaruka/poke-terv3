/**
 * Real-Time Overworld Combat & Wild Monster Roaming System
 * Seamless real-time fighting directly on the overworld map with visual attack effects,
 * floating damage popups, Capture Pod throwing, and multiplayer visibility.
 */

import { Direction, MonsterInstance, MonsterType } from 'poke-ter-shared';
import { Player } from '../entities/Player.js';
import { MONSTER_SPECIES, calculateStats, getMonsterSpecies } from 'poke-ter-shared';
import { MonsterRenderer } from '../../engine/rendering/MonsterRenderer.js';
import { ParticleSystem } from '../../engine/ParticleSystem.js';

export interface RoamingMonster {
  id: string;
  speciesId: number;
  speciesName: string;
  level: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  currentHp: number;
  maxHp: number;
  moveCooldown: number;
  isTrainerMonster?: boolean;
}

export interface ActiveAttackEffect {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number; // 0 to 1
  color: string;
  label: string;
}

export interface FloatingDamageText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number; // seconds
}

export interface CapturePodAnim {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  wiggles: number;
  success: boolean;
  speciesId: number;
  level: number;
}

export class OverworldCombatManager {
  private player: Player;
  private particleSystem: ParticleSystem;

  // Spawns & Battles
  public roamingMonsters: RoamingMonster[] = [];
  public activeTarget: RoamingMonster | null = null;
  public inCombat: boolean = false;

  // Effects & HUD
  public attackEffects: ActiveAttackEffect[] = [];
  public damageTexts: FloatingDamageText[] = [];
  public activeCapturePod: CapturePodAnim | null = null;

  // Cooldowns
  public playerAttackCooldown: number = 0;

  constructor(player: Player, particleSystem: ParticleSystem) {
    this.player = player;
    this.particleSystem = particleSystem;
  }

  /** Spawn roaming wild monsters in active route */
  public populateRouteMonsters(mapId: string, count: number = 6): void {
    this.roamingMonsters = [];
    if (mapId === 'city' || mapId.includes('interior')) return;

    // Species suitable for routes
    const routeSpecies = [10, 11, 1, 4, 7]; // Chirpix, Stratbeak, Flamepup, Sproutling, Aquafin

    for (let i = 0; i < count; i++) {
      const speciesId = routeSpecies[Math.floor(Math.random() * routeSpecies.length)];
      const species = MONSTER_SPECIES.find(s => s.id === speciesId) || MONSTER_SPECIES[0];
      const level = Math.floor(Math.random() * 4) + 3;
      const ivs = { hp: 15, attack: 15, defense: 15, spAttack: 15, spDefense: 15, speed: 15 };
      const evs = { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
      const stats = calculateStats(species.baseStats, ivs, evs, level);

      // Random position in route
      const rx = (Math.floor(Math.random() * 40) + 100) * 16;
      const ry = (Math.floor(Math.random() * 40) + 100) * 16;

      this.roamingMonsters.push({
        id: `wild_${i}_${Date.now()}`,
        speciesId: species.id,
        speciesName: species.name,
        level,
        x: rx,
        y: ry,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        currentHp: stats.hp,
        maxHp: stats.hp,
        moveCooldown: 2.0,
      });
    }
  }

  public update(dt: number): void {
    const dtSec = dt / 1000;

    if (this.playerAttackCooldown > 0) {
      this.playerAttackCooldown -= dtSec;
    }

    // Update roaming monster movement
    for (const m of this.roamingMonsters) {
      if (Math.random() < 0.02) {
        m.vx = (Math.random() - 0.5) * 12;
        m.vy = (Math.random() - 0.5) * 12;
      }
      m.x += m.vx * dtSec;
      m.y += m.vy * dtSec;

      // Check combat proximity with player follower
      if (this.player.party && this.player.party.length > 0) {
        const followerX = this.player.x;
        const followerY = this.player.y;
        const dx = m.x - followerX;
        const dy = m.y - followerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 42) {
          this.inCombat = true;
          this.activeTarget = m;

          // Wild monster attacks back
          m.moveCooldown -= dtSec;
          if (m.moveCooldown <= 0) {
            m.moveCooldown = 2.0;
            this.executeEnemyAttack(m);
          }
        }
      }
    }

    // Update attack projectile effects
    for (let i = this.attackEffects.length - 1; i >= 0; i--) {
      const fx = this.attackEffects[i];
      fx.progress += dtSec * 3.5;
      if (fx.progress >= 1) {
        this.particleSystem.emit(fx.targetX, fx.targetY, 10, [fx.color, '#ffffff'], 1.0, 15, 50, 'sparkle');
        this.attackEffects.splice(i, 1);
      }
    }

    // Update floating damage popups
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const txt = this.damageTexts[i];
      txt.y -= 12 * dtSec;
      txt.life -= dtSec;
      if (txt.life <= 0) {
        this.damageTexts.splice(i, 1);
      }
    }

    // Update capture pod animation
    if (this.activeCapturePod) {
      const pod = this.activeCapturePod;
      pod.progress += dtSec * 1.8;

      if (pod.progress >= 1.0) {
        pod.wiggles++;
        if (pod.wiggles >= 3) {
          // Finish catch check
          if (pod.success) {
            this.addCaughtMonsterToParty(pod.speciesId, pod.level);
            this.damageTexts.push({
              x: pod.targetX,
              y: pod.targetY - 10,
              text: 'GOTCHA! CAUGHT!',
              color: '#00ff66',
              life: 2.5,
            });
            this.particleSystem.emit(pod.targetX, pod.targetY, 20, ['#00ff66', '#ffff00', '#ffffff'], 1.5, 20, 80, 'sparkle');

            // Remove wild monster
            if (this.activeTarget) {
              this.roamingMonsters = this.roamingMonsters.filter(rm => rm.id !== this.activeTarget?.id);
              this.activeTarget = null;
              this.inCombat = false;
            }
          } else {
            this.damageTexts.push({
              x: pod.targetX,
              y: pod.targetY - 10,
              text: 'BROKE FREE!',
              color: '#ff3366',
              life: 2.0,
            });
          }
          this.activeCapturePod = null;
        } else {
          pod.progress = 0.5; // Reset for next wiggle
        }
      }
    }
  }

  /** Player executes overworld real-time move (Keys 1, 2, 3) */
  public triggerPlayerAttack(moveIndex: number): void {
    if (!this.activeTarget || this.playerAttackCooldown > 0) return;
    const activeMonster = this.player.party?.[0];
    if (!activeMonster || activeMonster.currentHp <= 0) return;

    this.playerAttackCooldown = 1.2;

    const moveNames = ['Tackle', 'Ember / Element Jet', 'Quick Strike'];
    const moveColors = ['#ffcc00', '#ff4500', '#4deeea'];
    const damage = Math.floor(Math.random() * 12) + 12 + Math.floor(activeMonster.stats.attack / 4);

    const startX = this.player.x + 8;
    const startY = this.player.y + 8;
    const targetX = this.activeTarget.x + 8;
    const targetY = this.activeTarget.y + 8;

    this.attackEffects.push({
      x: startX,
      y: startY,
      targetX,
      targetY,
      progress: 0,
      color: moveColors[moveIndex] || '#ffffff',
      label: moveNames[moveIndex] || 'Attack',
    });

    // Apply damage to wild target
    this.activeTarget.currentHp = Math.max(0, this.activeTarget.currentHp - damage);

    this.damageTexts.push({
      x: targetX,
      y: targetY - 12,
      text: `-${damage} HP!`,
      color: '#ff007f',
      life: 1.8,
    });

    if (this.activeTarget.currentHp <= 0) {
      // Defeated wild monster!
      this.damageTexts.push({
        x: targetX,
        y: targetY - 24,
        text: `+${this.activeTarget.level * 25} EXP! +$150 COINS`,
        color: '#00ff66',
        life: 2.5,
      });

      this.player.money += 150;
      activeMonster.experience += this.activeTarget.level * 25;

      // Check Level Up
      if (activeMonster.experience >= activeMonster.experienceToNext) {
        activeMonster.level++;
        activeMonster.experience = 0;
        activeMonster.experienceToNext += 100;
        activeMonster.maxHp += 8;
        activeMonster.currentHp = activeMonster.maxHp;
        this.damageTexts.push({
          x: this.player.x,
          y: this.player.y - 30,
          text: `LEVEL UP! Lv.${activeMonster.level}`,
          color: '#ffff00',
          life: 3.0,
        });
      }

      this.particleSystem.emit(targetX, targetY, 15, ['#ff4500', '#ffff00'], 1.2, 18, 60, 'sparkle');
      this.roamingMonsters = this.roamingMonsters.filter(m => m.id !== this.activeTarget?.id);
      this.activeTarget = null;
      this.inCombat = false;
    }
  }

  /** Enemy monster attacks player follower */
  private executeEnemyAttack(monster: RoamingMonster): void {
    const activeMonster = this.player.party?.[0];
    if (!activeMonster) return;

    const damage = Math.floor(Math.random() * 8) + 6;
    activeMonster.currentHp = Math.max(0, activeMonster.currentHp - damage);

    this.attackEffects.push({
      x: monster.x + 8,
      y: monster.y + 8,
      targetX: this.player.x + 8,
      targetY: this.player.y + 8,
      progress: 0,
      color: '#e74c3c',
      label: 'Wild Strike',
    });

    this.damageTexts.push({
      x: this.player.x,
      y: this.player.y - 12,
      text: `-${damage} HP!`,
      color: '#e74c3c',
      life: 1.8,
    });
  }

  /** Throw Capture Pod directly in overworld */
  public throwCapturePod(): void {
    if (!this.activeTarget || this.activeCapturePod) return;

    // Check inventory for capture pods
    const podItem = this.player.inventory.find(i => i.itemId === 1 || i.itemId === 2);
    if (!podItem || podItem.quantity <= 0) {
      this.damageTexts.push({
        x: this.player.x,
        y: this.player.y - 18,
        text: 'NO CAPTURE PODS IN BAG!',
        color: '#ff3366',
        life: 2.0,
      });
      return;
    }

    podItem.quantity--;

    const hpRatio = this.activeTarget.currentHp / this.activeTarget.maxHp;
    const catchChance = Math.max(0.35, 1.0 - hpRatio * 0.7);
    const success = Math.random() < catchChance;

    this.activeCapturePod = {
      startX: this.player.x + 8,
      startY: this.player.y + 8,
      targetX: this.activeTarget.x + 8,
      targetY: this.activeTarget.y + 8,
      progress: 0,
      wiggles: 0,
      success,
      speciesId: this.activeTarget.speciesId,
      level: this.activeTarget.level,
    };
  }

  private addCaughtMonsterToParty(speciesId: number, level: number): void {
    const species = MONSTER_SPECIES.find(s => s.id === speciesId) || MONSTER_SPECIES[0];
    const ivs = { hp: 20, attack: 20, defense: 20, spAttack: 20, spDefense: 20, speed: 20 };
    const evs = { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
    const stats = calculateStats(species.baseStats, ivs, evs, level);

    const caughtMonster: MonsterInstance = {
      speciesId: species.id,
      nickname: species.name,
      level,
      ivs,
      evs,
      nature: 0,
      currentHp: stats.hp,
      maxHp: stats.hp,
      stats,
      moves: [1, 2],
      status: 0,
      friendship: 70,
      experience: 0,
      experienceToNext: 100,
    };

    if (!this.player.party) this.player.party = [];
    this.player.party.push(caughtMonster);
  }

  /** Render roaming monsters, attack effects, damage text, and combat HUD */
  public render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number, time: number): void {
    // 1. Render Roaming Wild Monsters
    for (const m of this.roamingMonsters) {
      const screenX = Math.round(m.x - offsetX);
      const screenY = Math.round(m.y - offsetY);

      // Determine facing direction dynamically based on velocity
      let roamDir: Direction = 'down';
      if (Math.abs(m.vx) > Math.abs(m.vy)) {
        roamDir = m.vx > 0 ? 'right' : 'left';
      } else if (Math.abs(m.vy) > 0.05) {
        roamDir = m.vy > 0 ? 'down' : 'up';
      }

      MonsterRenderer.renderMonster(
        ctx,
        screenX,
        screenY,
        m.speciesId,
        m.speciesName,
        m.level,
        m.currentHp,
        m.maxHp,
        false,
        undefined,
        time,
        true,
        roamDir
      );
    }

    // 2. Render Projectiles
    for (const fx of this.attackEffects) {
      const curX = fx.x + (fx.targetX - fx.x) * fx.progress - offsetX;
      const curY = fx.y + (fx.targetY - fx.y) * fx.progress - offsetY;

      ctx.save();
      ctx.fillStyle = fx.color;
      ctx.beginPath();
      ctx.arc(curX, curY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Render Capture Pod Throwable Anim
    if (this.activeCapturePod) {
      const pod = this.activeCapturePod;
      const curX = pod.startX + (pod.targetX - pod.startX) * Math.min(1, pod.progress) - offsetX;
      const curY = pod.startY + (pod.targetY - pod.startY) * Math.min(1, pod.progress) - offsetY - Math.sin(pod.progress * Math.PI) * 16;

      ctx.save();
      ctx.fillStyle = '#ff3333';
      ctx.beginPath();
      ctx.arc(curX, curY, 4, Math.PI, 0, false);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(curX, curY, 4, 0, Math.PI, false);
      ctx.fill();
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(curX, curY, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Render Floating Damage Text Popups
    for (const txt of this.damageTexts) {
      ctx.save();
      ctx.fillStyle = txt.color;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(txt.text, Math.round(txt.x - offsetX), Math.round(txt.y - offsetY));
      ctx.restore();
    }

    // 5. Overworld Real-Time Combat Action Bar HUD
    if (this.inCombat && this.activeTarget) {
      const hudW = 280;
      const hudH = 32;
      const hudX = (ctx.canvas.width - hudW) / 2;
      const hudY = ctx.canvas.height - 48;

      ctx.save();
      ctx.fillStyle = 'rgba(12, 18, 34, 0.92)';
      ctx.fillRect(hudX, hudY, hudW, hudH);
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hudX, hudY, hudW, hudH);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`VS ${this.activeTarget.speciesName.toUpperCase()} (Lv.${this.activeTarget.level}) - OVERWORLD REAL-TIME BATTLE`, hudX + hudW / 2, hudY + 8);

      ctx.fillStyle = '#4deeea';
      ctx.font = '7.5px monospace';
      ctx.fillText('[1] Elemental Move  |  [2] Main Attack  |  [3] Quick Strike  |  [4] Capture Pod  |  [5] Run', hudX + hudW / 2, hudY + 22);
      ctx.restore();
    }
  }
}
