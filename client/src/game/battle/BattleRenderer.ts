import { MonsterSnapshot, MonsterType, getMonsterSpecies } from 'poke-ter-shared';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export class BattleRenderer {
  private animTime: number = 0;
  private particles: Particle[] = [];
  private screenShakeTime: number = 0;
  private screenShakeIntensity: number = 0;

  // Intro sliding offsets (0 = offscreen, 1 = fully on position)
  public opponentTrainerSlide: number = 0;
  public playerTrainerSlide: number = 0;
  public opponentMonSlide: number = 0;
  public playerMonSlide: number = 0;

  // Sprite opacity / faint offsets
  public opponentMonOpacity: number = 1;
  public playerMonOpacity: number = 1;
  public opponentMonFaintOffsetY: number = 0;
  public playerMonFaintOffsetY: number = 0;

  // Pokéball throw animation states
  public activeBallArc: {
    targetSide: 'player' | 'opponent';
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    progress: number;
  } | null = null;

  public update(dt: number): void {
    const dtSec = dt / 1000;
    this.animTime += dtSec;

    // Screen shake countdown
    if (this.screenShakeTime > 0) {
      this.screenShakeTime -= dtSec;
    }

    // Particles update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.life -= dtSec;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Ball arc update
    if (this.activeBallArc) {
      this.activeBallArc.progress += dtSec * 2.5; // ~400ms throw
      if (this.activeBallArc.progress >= 1.0) {
        this.spawnBurstParticles(
          this.activeBallArc.targetX,
          this.activeBallArc.targetY,
          '#f1c40f',
          18
        );
        this.activeBallArc = null;
      }
    }
  }

  public triggerScreenShake(durationSec: number = 0.3, intensity: number = 5): void {
    this.screenShakeTime = durationSec;
    this.screenShakeIntensity = intensity;
  }

  public spawnBurstParticles(x: number, y: number, color: string = '#f39c12', count: number = 12): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 3,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6
      });
    }
  }

  public throwPokeball(targetSide: 'player' | 'opponent'): void {
    if (targetSide === 'opponent') {
      this.activeBallArc = {
        targetSide,
        startX: 40,
        startY: 180,
        targetX: 235,
        targetY: 90,
        progress: 0
      };
    } else {
      this.activeBallArc = {
        targetSide,
        startX: 280,
        startY: 120,
        targetX: 85,
        targetY: 155,
        progress: 0
      };
    }
  }

  public renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number, bgType: string = 'grass'): void {
    ctx.save();

    // Apply screen shake offset if active
    if (this.screenShakeTime > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShakeIntensity * 2;
      const shakeY = (Math.random() - 0.5) * this.screenShakeIntensity * 2;
      ctx.translate(shakeX, shakeY);
    }

    // Sky / Environment background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (bgType === 'water') {
      gradient.addColorStop(0, '#1a5276');
      gradient.addColorStop(0.6, '#2980b9');
      gradient.addColorStop(1, '#a9cce3');
    } else if (bgType === 'cave') {
      gradient.addColorStop(0, '#1c2833');
      gradient.addColorStop(0.6, '#2c3e50');
      gradient.addColorStop(1, '#566573');
    } else { // grass / city
      gradient.addColorStop(0, '#52be80');
      gradient.addColorStop(0.55, '#a2d9ce');
      gradient.addColorStop(1, '#f9e79f');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative distant hills / horizon pattern
    ctx.fillStyle = bgType === 'cave' ? '#11161d' : '#27ae60';
    ctx.beginPath();
    ctx.ellipse(80, 130, 140, 35, 0, 0, Math.PI * 2);
    ctx.ellipse(260, 135, 120, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Opponent Platform pedestal (top-right)
    ctx.fillStyle = '#1e8449';
    ctx.beginPath();
    ctx.ellipse(235, 100, 65, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#145a32';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Player Platform pedestal (bottom-left)
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.ellipse(85, 175, 80, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#196f3d';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  public renderOpponentTrainer(ctx: CanvasRenderingContext2D, name: string, isVisible: boolean): void {
    if (!isVisible || this.opponentTrainerSlide <= 0) return;

    const targetX = 235;
    const targetY = 65;
    const currentX = Math.round(targetX + (320 - targetX) * (1 - this.opponentTrainerSlide));

    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(currentX, targetY + 32, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pixel Trainer Silhouette / Avatar
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(currentX - 10, targetY - 20, 20, 24); // Coat
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(currentX - 8, targetY + 4, 16, 26); // Pants
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(currentX - 8, targetY - 32, 16, 12); // Head/Cap

    // Cap Visor
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(currentX - 12, targetY - 28, 8, 3);

    ctx.restore();
  }

  public renderPlayerTrainer(ctx: CanvasRenderingContext2D, isVisible: boolean): void {
    if (!isVisible || this.playerTrainerSlide <= 0) return;

    const targetX = 85;
    const targetY = 135;
    const currentX = Math.round(targetX - (150) * (1 - this.playerTrainerSlide));

    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(currentX, targetY + 36, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Player Back Sprite Graphic
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(currentX - 14, targetY - 15, 28, 30); // Jacket back
    ctx.fillStyle = '#1b4f72';
    ctx.fillRect(currentX - 10, targetY + 15, 20, 22); // Pants
    ctx.fillStyle = '#d35400';
    ctx.fillRect(currentX - 12, targetY - 28, 24, 14); // Hair / Hat back

    ctx.restore();
  }

  public renderOpponentMonster(ctx: CanvasRenderingContext2D, mon: MonsterSnapshot | null): void {
    if (!mon || this.opponentMonOpacity <= 0) return;

    const species = getMonsterSpecies(mon.speciesId);
    const name = mon.nickname || species?.name || 'Opponent';
    const floatY = Math.sin(this.animTime * 3) * 2;
    const x = 235;
    const y = 80 + floatY + this.opponentMonFaintOffsetY;

    ctx.save();
    ctx.globalAlpha = this.opponentMonOpacity;

    // Monster Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(235, 98, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Front Sprite Monster Graphic (Pixel Art representation based on species)
    this.drawMonsterSprite(ctx, mon.speciesId, x, y, false);

    ctx.restore();
  }

  public renderPlayerMonster(ctx: CanvasRenderingContext2D, mon: MonsterSnapshot | null): void {
    if (!mon || this.playerMonOpacity <= 0) return;

    const species = getMonsterSpecies(mon.speciesId);
    const name = mon.nickname || species?.name || 'Player';
    const floatY = Math.sin(this.animTime * 3 + 1) * 2;
    const x = 85;
    const y = 145 + floatY + this.playerMonFaintOffsetY;

    ctx.save();
    ctx.globalAlpha = this.playerMonOpacity;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(85, 172, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Back Sprite Monster Graphic
    this.drawMonsterSprite(ctx, mon.speciesId, x, y, true);

    ctx.restore();
  }

  private drawMonsterSprite(ctx: CanvasRenderingContext2D, speciesId: number, x: number, y: number, isBack: boolean): void {
    // Generate distinct, high-quality pixel monster visual depending on species
    const species = getMonsterSpecies(speciesId);
    const primaryType = species ? species.types[0] : MonsterType.Normal;

    let primaryColor = '#e74c3c'; // Fire red
    if (primaryType === MonsterType.Water) primaryColor = '#3498db';
    if (primaryType === MonsterType.Grass) primaryColor = '#2ecc71';
    if (primaryType === MonsterType.Electric) primaryColor = '#f1c40f';
    if (primaryType === MonsterType.Flying) primaryColor = '#9b59b6';

    const scale = isBack ? 1.25 : 1.0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Body Main Shape
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    // Head / Accent
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (!isBack) {
      // Eyes for front sprite
      ctx.arc(-6, -4, 3, 0, Math.PI * 2);
      ctx.arc(6, -4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(-6, -4, 1.5, 0, Math.PI * 2);
      ctx.arc(6, -4, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Back markings / pattern for back sprite
      ctx.arc(0, -2, 8, 0, Math.PI);
      ctx.fill();
    }

    // Distinct horns / ears / flames based on speciesId
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.moveTo(-12, -14);
    ctx.lineTo(-6, -24);
    ctx.lineTo(0, -14);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(6, -24);
    ctx.lineTo(12, -14);
    ctx.fill();

    ctx.restore();
  }

  public renderOpponentStatusBox(ctx: CanvasRenderingContext2D, mon: MonsterSnapshot | null): void {
    if (!mon) return;

    const x = 12;
    const y = 14;
    const w = 135;
    const h = 38;

    const species = getMonsterSpecies(mon.speciesId);
    const name = (mon.nickname || species?.name || 'Opponent').toUpperCase();

    ctx.save();

    // Box Background Frame
    ctx.fillStyle = '#f8f8f0';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#282828';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Monster Name
    ctx.fillStyle = '#101010';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(name.slice(0, 10), x + 8, y + 6);

    // Level
    ctx.fillStyle = '#d35400';
    ctx.fillText(`Lv${mon.level}`, x + w - 38, y + 6);

    // HP Bar Frame
    const hpBarX = x + 34;
    const hpBarY = y + 20;
    const hpBarW = 88;
    const hpBarH = 6;

    ctx.fillStyle = '#202020';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillText('HP', x + 10, hpBarY);

    ctx.fillStyle = '#404040';
    ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);

    // Fill ratio
    const hpRatio = Math.max(0, Math.min(1, mon.currentHp / mon.maxHp));
    let barColor = '#2ecc71'; // Green
    if (hpRatio <= 0.5) barColor = '#f1c40f'; // Yellow
    if (hpRatio <= 0.2) barColor = '#e74c3c'; // Red

    ctx.fillStyle = barColor;
    ctx.fillRect(hpBarX + 1, hpBarY + 1, Math.floor((hpBarW - 2) * hpRatio), hpBarH - 2);

    ctx.restore();
  }

  public renderPlayerStatusBox(ctx: CanvasRenderingContext2D, mon: MonsterSnapshot | null, expRatio: number = 0.65): void {
    if (!mon) return;

    const x = 170;
    const y = 126;
    const w = 140;
    const h = 48;

    const species = getMonsterSpecies(mon.speciesId);
    const name = (mon.nickname || species?.name || 'Player').toUpperCase();

    ctx.save();

    // Box Background Frame
    ctx.fillStyle = '#f8f8f0';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#282828';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Monster Name
    ctx.fillStyle = '#101010';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(name.slice(0, 10), x + 8, y + 6);

    // Level
    ctx.fillStyle = '#d35400';
    ctx.fillText(`Lv${mon.level}`, x + w - 38, y + 6);

    // HP Bar
    const hpBarX = x + 38;
    const hpBarY = y + 20;
    const hpBarW = 88;
    const hpBarH = 6;

    ctx.fillStyle = '#202020';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.fillText('HP', x + 10, hpBarY);

    ctx.fillStyle = '#404040';
    ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);

    const hpRatio = Math.max(0, Math.min(1, mon.currentHp / mon.maxHp));
    let barColor = '#2ecc71';
    if (hpRatio <= 0.5) barColor = '#f1c40f';
    if (hpRatio <= 0.2) barColor = '#e74c3c';

    ctx.fillStyle = barColor;
    ctx.fillRect(hpBarX + 1, hpBarY + 1, Math.floor((hpBarW - 2) * hpRatio), hpBarH - 2);

    // HP Numbers (e.g. 45/ 45)
    ctx.fillStyle = '#101010';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.ceil(mon.currentHp)}/ ${mon.maxHp}`, x + w - 10, y + 29);

    // EXP Bar (Bottom blue bar)
    const expBarX = x + 38;
    const expBarY = y + 39;
    const expBarW = 88;
    const expBarH = 3;

    ctx.fillStyle = '#202020';
    ctx.fillRect(expBarX, expBarY, expBarW, expBarH);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(expBarX + 1, expBarY + 1, Math.floor((expBarW - 2) * expRatio), expBarH - 2);

    ctx.restore();
  }

  public renderActiveBallArc(ctx: CanvasRenderingContext2D): void {
    if (!this.activeBallArc) return;

    const { startX, startY, targetX, targetY, progress } = this.activeBallArc;
    const currentX = startX + (targetX - startX) * progress;
    // Parabolic arc formula
    const heightPeak = 50;
    const arcY = startY + (targetY - startY) * progress - Math.sin(progress * Math.PI) * heightPeak;

    ctx.save();
    // Pokéball graphic
    ctx.beginPath();
    ctx.arc(currentX, arcY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(currentX, arcY + 2, 5, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#101010';
    ctx.lineWidth = 1;
    ctx.strokeRect(currentX - 5, arcY - 1, 10, 2);
    ctx.restore();
  }

  public renderParticles(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }
}
