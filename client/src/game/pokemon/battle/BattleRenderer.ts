import { MonsterSnapshot, MonsterType, getMonsterSpecies, BattleEnvironmentData } from 'poke-ter-shared';

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

  public throwCapturePod(targetSide: 'player' | 'opponent'): void {
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

  public renderBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    envInput: BattleEnvironmentData | string = 'grass',
    timeSec?: number
  ): void {
    let env: BattleEnvironmentData;
    if (typeof envInput === 'string') {
      env = {
        mapId: envInput,
        x: 0,
        y: 0,
        seed: 12345,
        biomeId: envInput === 'water' ? 'lake' : envInput === 'cave' ? 'cave' : 'plains',
        biomeName: envInput,
        weather: 'clear',
        timeOfDay: 'day',
        isInterior: envInput.includes('interior'),
        groundTile: envInput === 'water' ? 3 : envInput === 'cave' ? 4 : 1,
        nearbyObjects: []
      };
    } else {
      env = envInput;
    }

    const t = timeSec !== undefined ? timeSec : this.animTime;
    this.renderDynamicBackground(ctx, width, height, env, t);
  }

  private renderDynamicBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    env: BattleEnvironmentData,
    timeSec: number
  ): void {
    ctx.save();

    let shakeX = 0;
    let shakeY = 0;
    if (this.screenShakeTime > 0) {
      shakeX = (Math.random() - 0.5) * this.screenShakeIntensity * 2;
      shakeY = (Math.random() - 0.5) * this.screenShakeIntensity * 2;
    }

    const camSwayX = Math.sin(timeSec * 0.8) * 3 + shakeX;
    const camSwayY = Math.cos(timeSec * 0.6) * 1.5 + shakeY;

    ctx.translate(shakeX, shakeY);

    const biome = env.biomeId || 'plains';
    const weather = env.weather || 'clear';
    const timeOfDay = env.timeOfDay || 'day';
    const isInterior = env.isInterior || false;
    const seed = env.seed || 12345;
    const groundTile = env.groundTile || 1;
    const nearbyObjects = env.nearbyObjects || [];

    // LAYER 1: SKY & CELESTIAL / INDOOR WALL
    this.renderSkyAndCeiling(ctx, width, height, env, biome, weather, timeOfDay, isInterior, seed, timeSec, camSwayX, camSwayY);

    // LAYER 2: FAR BACKGROUND (Parallax x0.2)
    this.renderFarBackground(ctx, width, height, biome, weather, timeOfDay, isInterior, seed, timeSec, camSwayX * 0.2);

    // LAYER 3: MID BACKGROUND (Parallax x0.5)
    this.renderMidBackground(ctx, width, height, env, biome, weather, timeOfDay, isInterior, seed, nearbyObjects, timeSec, camSwayX * 0.5);

    // LAYER 4: BATTLE GROUND & PEDESTALS (Parallax x1.0)
    this.renderBattleGroundAndPedestals(ctx, width, height, biome, groundTile, isInterior, nearbyObjects, timeSec, camSwayX * 1.0);

    // LAYER 5: FOREGROUND FRAMING & WEATHER PARTICLES (Parallax x1.3)
    this.renderForegroundAndWeather(ctx, width, height, biome, weather, timeOfDay, isInterior, seed, nearbyObjects, timeSec, camSwayX * 1.3);

    // ATMOSPHERIC LIGHTING TINT
    this.renderAtmosphericLighting(ctx, width, height, weather, timeOfDay, isInterior);

    ctx.restore();
  }

  private renderSkyAndCeiling(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    env: BattleEnvironmentData,
    biome: string,
    weather: string,
    timeOfDay: string,
    isInterior: boolean,
    seed: number,
    timeSec: number,
    swayX: number,
    swayY: number
  ): void {
    if (isInterior) {
      const grad = ctx.createLinearGradient(0, 0, 0, height * 0.7);
      if (env.mapId.includes('lab')) {
        grad.addColorStop(0, '#1c2833');
        grad.addColorStop(0.5, '#2c3e50');
        grad.addColorStop(1, '#34495e');
      } else if (env.mapId.includes('pokecenter')) {
        grad.addColorStop(0, '#fadbd8');
        grad.addColorStop(0.5, '#f5b7b1');
        grad.addColorStop(1, '#e74c3c');
      } else if (env.mapId.includes('mart')) {
        grad.addColorStop(0, '#d4efdf');
        grad.addColorStop(0.5, '#a9dfbf');
        grad.addColorStop(1, '#2980b9');
      } else {
        grad.addColorStop(0, '#f5eef8');
        grad.addColorStop(0.5, '#ebdef0');
        grad.addColorStop(1, '#6e2c00');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Crown molding / Wall trim
      ctx.fillStyle = '#101010';
      ctx.fillRect(0, 0, width, 6);
      ctx.fillStyle = '#d5dbdb';
      ctx.fillRect(0, 6, width, 4);

      // Window showing outside world sky
      const winX = 130 + swayX;
      const winY = 20 + swayY;
      const winW = 60;
      const winH = 40;
      ctx.save();
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(winX - 2, winY - 2, winW + 4, winH + 4);

      const winSky = ctx.createLinearGradient(winX, winY, winX, winY + winH);
      if (timeOfDay === 'night') {
        winSky.addColorStop(0, '#09203f');
        winSky.addColorStop(1, '#111d29');
      } else if (timeOfDay === 'evening') {
        winSky.addColorStop(0, '#ff0844');
        winSky.addColorStop(1, '#ffb199');
      } else if (timeOfDay === 'morning') {
        winSky.addColorStop(0, '#fa709a');
        winSky.addColorStop(1, '#fee140');
      } else {
        winSky.addColorStop(0, '#3a7bd5');
        winSky.addColorStop(1, '#a1c4fd');
      }
      ctx.fillStyle = winSky;
      ctx.fillRect(winX, winY, winW, winH);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(winX + winW / 2 - 1, winY, 2, winH);
      ctx.fillRect(winX, winY + winH / 2 - 1, winW, 2);
      ctx.restore();
      return;
    }

    if (biome === 'cave' || env.mapId.includes('cave')) {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#0b0e14');
      grad.addColorStop(0.5, '#1a252f');
      grad.addColorStop(1, '#2c3e50');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#11161d';
      ctx.beginPath();
      ctx.moveTo(10, 0); ctx.lineTo(25, 25); ctx.lineTo(40, 0);
      ctx.moveTo(90, 0); ctx.lineTo(110, 35); ctx.lineTo(130, 0);
      ctx.moveTo(200, 0); ctx.lineTo(215, 28); ctx.lineTo(230, 0);
      ctx.moveTo(270, 0); ctx.lineTo(285, 38); ctx.lineTo(300, 0);
      ctx.fill();
      return;
    }

    // Outdoor Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.7);
    if (weather === 'storm') {
      skyGrad.addColorStop(0, '#1e272e');
      skyGrad.addColorStop(0.6, '#485460');
      skyGrad.addColorStop(1, '#808e9b');
    } else if (weather === 'rain' || weather === 'cloudy') {
      skyGrad.addColorStop(0, '#3d3d3d');
      skyGrad.addColorStop(0.6, '#718093');
      skyGrad.addColorStop(1, '#dcdde1');
    } else if (weather === 'snow') {
      skyGrad.addColorStop(0, '#dcdde1');
      skyGrad.addColorStop(0.6, '#718093');
      skyGrad.addColorStop(1, '#f5f6fa');
    } else {
      if (timeOfDay === 'morning') {
        skyGrad.addColorStop(0, '#fa709a');
        skyGrad.addColorStop(0.5, '#fee140');
        skyGrad.addColorStop(1, '#fce38a');
      } else if (timeOfDay === 'evening') {
        skyGrad.addColorStop(0, '#4a00e0');
        skyGrad.addColorStop(0.4, '#ff0844');
        skyGrad.addColorStop(0.8, '#ffb199');
        skyGrad.addColorStop(1, '#f9d423');
      } else if (timeOfDay === 'night') {
        skyGrad.addColorStop(0, '#050c1a');
        skyGrad.addColorStop(0.5, '#09203f');
        skyGrad.addColorStop(1, '#1e3c72');
      } else {
        skyGrad.addColorStop(0, '#2193b0');
        skyGrad.addColorStop(0.55, '#6dd5ed');
        skyGrad.addColorStop(1, '#e0eafc');
      }
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    if (timeOfDay === 'night' && weather === 'clear') {
      for (let i = 0; i < 25; i++) {
        const sx = ((seed * 3 + i * 47) % width);
        const sy = ((seed * 7 + i * 19) % Math.floor(height * 0.45));
        const tw = Math.sin(timeSec * 3 + i) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + tw * 0.6})`;
        ctx.fillRect(sx + swayX * 0.1, sy + swayY * 0.1, tw > 0.8 ? 2 : 1, tw > 0.8 ? 2 : 1);
      }

      const mx = 230 + swayX * 0.1;
      const my = 25 + swayY * 0.1;
      ctx.fillStyle = 'rgba(255, 255, 230, 0.2)';
      ctx.beginPath();
      ctx.arc(mx, my, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef9e7';
      ctx.beginPath();
      ctx.arc(mx, my, 9, 0, Math.PI * 2);
      ctx.fill();
    } else if (timeOfDay !== 'night' && weather === 'clear') {
      const sunX = timeOfDay === 'morning' ? 60 : timeOfDay === 'evening' ? 260 : 210;
      const sunY = timeOfDay === 'morning' ? 45 : timeOfDay === 'evening' ? 40 : 25;
      const sunColor = timeOfDay === 'evening' ? '#ff7e5f' : timeOfDay === 'morning' ? '#ffb347' : '#ffffff';

      ctx.fillStyle = `${sunColor}33`;
      ctx.beginPath();
      ctx.arc(sunX + swayX * 0.1, sunY + swayY * 0.1, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = sunColor;
      ctx.beginPath();
      ctx.arc(sunX + swayX * 0.1, sunY + swayY * 0.1, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    if (weather !== 'clear' || timeOfDay === 'day' || timeOfDay === 'morning') {
      ctx.fillStyle = weather === 'storm' ? 'rgba(40, 50, 60, 0.7)' :
                      weather === 'rain' ? 'rgba(100, 110, 125, 0.6)' :
                      'rgba(255, 255, 255, 0.55)';
      const cloudOffset = (timeSec * 8) % (width + 120);
      const c1X = (cloudOffset) - 60;
      const c2X = ((cloudOffset + 180) % (width + 120)) - 60;

      ctx.beginPath();
      ctx.arc(c1X + swayX * 0.15, 30, 16, 0, Math.PI * 2);
      ctx.arc(c1X + 15 + swayX * 0.15, 25, 20, 0, Math.PI * 2);
      ctx.arc(c1X + 35 + swayX * 0.15, 32, 14, 0, Math.PI * 2);

      ctx.arc(c2X + swayX * 0.15, 42, 14, 0, Math.PI * 2);
      ctx.arc(c2X + 16 + swayX * 0.15, 36, 18, 0, Math.PI * 2);
      ctx.arc(c2X + 32 + swayX * 0.15, 42, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderFarBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    biome: string,
    weather: string,
    timeOfDay: string,
    isInterior: boolean,
    seed: number,
    timeSec: number,
    swayX: number
  ): void {
    if (isInterior || biome === 'cave') return;

    ctx.save();

    if (biome === 'desert') {
      ctx.fillStyle = timeOfDay === 'night' ? '#1c2833' : '#d35400';
      ctx.beginPath();
      ctx.ellipse(70 + swayX, 115, 120, 25, 0, 0, Math.PI * 2);
      ctx.ellipse(240 + swayX, 120, 140, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (biome === 'mountain' || biome === 'ice_peak') {
      ctx.fillStyle = biome === 'ice_peak' ? '#7fb3d5' : timeOfDay === 'night' ? '#1b2631' : '#34495e';
      ctx.beginPath();
      ctx.moveTo(-20 + swayX, 125);
      ctx.lineTo(40 + swayX, 60);
      ctx.lineTo(110 + swayX, 125);
      ctx.lineTo(180 + swayX, 50);
      ctx.lineTo(260 + swayX, 125);
      ctx.lineTo(330 + swayX, 55);
      ctx.lineTo(360 + swayX, 125);
      ctx.fill();

      ctx.fillStyle = '#f2f4f4';
      ctx.beginPath();
      ctx.moveTo(33 + swayX, 70); ctx.lineTo(40 + swayX, 60); ctx.lineTo(48 + swayX, 72); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(172 + swayX, 62); ctx.lineTo(180 + swayX, 50); ctx.lineTo(189 + swayX, 64); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(322 + swayX, 66); ctx.lineTo(330 + swayX, 55); ctx.lineTo(338 + swayX, 68); ctx.fill();
    } else if (biome === 'city') {
      ctx.fillStyle = timeOfDay === 'night' ? '#111823' : '#34495e';
      ctx.fillRect(20 + swayX, 80, 45, 45);
      ctx.fillRect(80 + swayX, 70, 55, 55);
      ctx.fillRect(150 + swayX, 85, 40, 40);
      ctx.fillRect(210 + swayX, 65, 60, 60);
      ctx.fillRect(285 + swayX, 78, 50, 47);
    } else if (biome === 'lake') {
      ctx.fillStyle = timeOfDay === 'night' ? '#12263a' : '#1b4f72';
      ctx.fillRect(0, 100, width, 30);
      ctx.fillStyle = timeOfDay === 'night' ? '#0d1f2d' : '#1e8449';
      ctx.beginPath();
      ctx.ellipse(80 + swayX, 110, 110, 18, 0, 0, Math.PI * 2);
      ctx.ellipse(260 + swayX, 112, 100, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = timeOfDay === 'night' ? '#0d1e16' : '#196f3d';
      ctx.beginPath();
      ctx.ellipse(70 + swayX, 120, 130, 30, 0, 0, Math.PI * 2);
      ctx.ellipse(250 + swayX, 125, 120, 28, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderMidBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    env: BattleEnvironmentData,
    biome: string,
    weather: string,
    timeOfDay: string,
    isInterior: boolean,
    seed: number,
    nearbyObjects: string[],
    timeSec: number,
    swayX: number
  ): void {
    ctx.save();

    if (isInterior) {
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(20 + swayX, 75, 40, 30);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(25 + swayX, 65, 8, 10);
      ctx.fillRect(35 + swayX, 67, 8, 8);

      ctx.fillStyle = '#34495e';
      ctx.fillRect(250 + swayX, 70, 35, 35);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(258 + swayX, 76, 19, 12);
      ctx.restore();
      return;
    }

    if (biome === 'cave') {
      ctx.fillStyle = '#1c2833';
      ctx.beginPath();
      ctx.moveTo(30 + swayX, 130); ctx.lineTo(45 + swayX, 75); ctx.lineTo(60 + swayX, 130);
      ctx.moveTo(260 + swayX, 130); ctx.lineTo(275 + swayX, 80); ctx.lineTo(290 + swayX, 130);
      ctx.fill();

      ctx.fillStyle = '#00ffff';
      ctx.fillRect(43 + swayX, 95, 4, 8);
      ctx.fillRect(273 + swayX, 100, 5, 9);
      ctx.restore();
      return;
    }

    const treeColor = timeOfDay === 'night' ? '#145a32' : '#27ae60';
    const trunkColor = '#6e2c00';

    if (biome === 'desert') {
      ctx.fillStyle = trunkColor;
      ctx.fillRect(35 + swayX, 85, 6, 30);
      ctx.fillStyle = '#229954';
      ctx.beginPath();
      ctx.arc(38 + swayX, 85, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = trunkColor;
      ctx.fillRect(275 + swayX, 88, 6, 28);
      ctx.fillStyle = '#229954';
      ctx.beginPath();
      ctx.arc(278 + swayX, 88, 14, 0, Math.PI * 2);
      ctx.fill();
    } else if (biome === 'city') {
      ctx.fillStyle = '#a6acaf';
      ctx.fillRect(25 + swayX, 85, 45, 30);
      ctx.fillStyle = '#922b21';
      ctx.beginPath();
      ctx.moveTo(20 + swayX, 85); ctx.lineTo(47 + swayX, 68); ctx.lineTo(75 + swayX, 85); ctx.fill();

      ctx.fillStyle = (timeOfDay === 'night' || timeOfDay === 'evening') ? '#f1c40f' : '#85c1e9';
      ctx.fillRect(35 + swayX, 92, 10, 10);
      ctx.fillRect(52 + swayX, 92, 10, 10);

      ctx.fillStyle = '#d35400';
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(230 + i * 12 + swayX, 98, 3, 14);
      }
      ctx.fillRect(228 + swayX, 102, 70, 2);
    } else {
      ctx.fillStyle = trunkColor;
      ctx.fillRect(30 + swayX, 85, 8, 32);
      ctx.fillStyle = treeColor;
      ctx.beginPath();
      ctx.arc(34 + swayX, 80, 20, 0, Math.PI * 2);
      ctx.arc(24 + swayX, 84, 15, 0, Math.PI * 2);
      ctx.arc(44 + swayX, 84, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = trunkColor;
      ctx.fillRect(270 + swayX, 88, 8, 30);
      ctx.fillStyle = treeColor;
      ctx.beginPath();
      ctx.arc(274 + swayX, 82, 18, 0, Math.PI * 2);
      ctx.arc(264 + swayX, 86, 14, 0, Math.PI * 2);
      ctx.arc(284 + swayX, 86, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e8449';
      ctx.beginPath();
      ctx.arc(140 + swayX, 108, 12, 0, Math.PI * 2);
      ctx.arc(180 + swayX, 110, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(138 + swayX, 104, 3, 3);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(180 + swayX, 106, 3, 3);
    }

    ctx.restore();
  }

  private renderBattleGroundAndPedestals(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    biome: string,
    groundTile: number,
    isInterior: boolean,
    nearbyObjects: string[],
    timeSec: number,
    swayX: number
  ): void {
    ctx.save();

    let groundColor = '#27ae60';
    let subGroundColor = '#1e8449';
    let pedMainColor = '#2ecc71';
    let pedStrokeColor = '#196f3d';

    if (isInterior) {
      groundColor = '#6e2c00';
      subGroundColor = '#5c2400';
      pedMainColor = '#c0392b';
      pedStrokeColor = '#922b21';
    } else if (biome === 'cave') {
      groundColor = '#2c3e50';
      subGroundColor = '#1c2833';
      pedMainColor = '#34495e';
      pedStrokeColor = '#1f2d3d';
    } else if (biome === 'desert') {
      groundColor = '#f39c12';
      subGroundColor = '#d35400';
      pedMainColor = '#f5b041';
      pedStrokeColor = '#b9770e';
    } else if (biome === 'mountain') {
      groundColor = '#5d6d7e';
      subGroundColor = '#34495e';
      pedMainColor = '#85929e';
      pedStrokeColor = '#2e4053';
    } else if (biome === 'ice_peak' || biome === 'tundra') {
      groundColor = '#ebf5fb';
      subGroundColor = '#a9cce3';
      pedMainColor = '#d4e6f1';
      pedStrokeColor = '#5499c7';
    } else if (biome === 'lake' || groundTile === 3) {
      groundColor = '#2980b9';
      subGroundColor = '#1f618d';
      pedMainColor = '#a04000';
      pedStrokeColor = '#6e2c00';
    }

    const gGrad = ctx.createLinearGradient(0, 110, 0, height);
    gGrad.addColorStop(0, subGroundColor);
    gGrad.addColorStop(1, groundColor);
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, 110, width, height - 110);

    ctx.fillStyle = subGroundColor;
    ctx.fillRect(0, 108, width, 2);

    const opX = 235 + swayX;
    const opY = 100;
    ctx.fillStyle = subGroundColor;
    ctx.beginPath();
    ctx.ellipse(opX, opY + 3, 68, 19, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pedMainColor;
    ctx.beginPath();
    ctx.ellipse(opX, opY, 65, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pedStrokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    const plX = 85 + swayX;
    const plY = 175;
    ctx.fillStyle = subGroundColor;
    ctx.beginPath();
    ctx.ellipse(plX, plY + 4, 84, 23, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pedMainColor;
    ctx.beginPath();
    ctx.ellipse(plX, plY, 80, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pedStrokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  private renderForegroundAndWeather(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    biome: string,
    weather: string,
    timeOfDay: string,
    isInterior: boolean,
    seed: number,
    nearbyObjects: string[],
    timeSec: number,
    swayX: number
  ): void {
    ctx.save();

    if (!isInterior && biome !== 'cave') {
      ctx.fillStyle = '#196f3d';
      ctx.beginPath();
      ctx.arc(-10 + swayX, -10, 45, 0, Math.PI * 2);
      ctx.arc(20 + swayX, -15, 30, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#145a32';
      ctx.beginPath();
      ctx.arc(width + 10 + swayX, height + 5, 35, 0, Math.PI * 2);
      ctx.fill();
    }

    if (weather === 'rain' || weather === 'storm') {
      const dropCount = weather === 'storm' ? 35 : 20;
      ctx.strokeStyle = 'rgba(174, 214, 241, 0.75)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < dropCount; i++) {
        const rx = (seed * 11 + i * 37 + timeSec * 220) % (width + 40) - 20;
        const ry = (seed * 17 + i * 53 + timeSec * 340) % (height + 20);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - (weather === 'storm' ? 6 : 2), ry + 12);
        ctx.stroke();
      }

      if (weather === 'storm' && Math.sin(timeSec * 13 + seed) > 0.96) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(0, 0, width, height);
      }
    } else if (weather === 'snow') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let i = 0; i < 25; i++) {
        const sx = (seed * 13 + i * 29 + Math.sin(timeSec + i) * 15) % width;
        const sy = (seed * 19 + i * 41 + timeSec * 45) % height;
        ctx.fillRect(sx, sy, 2, 2);
      }
    } else if (timeOfDay === 'night' && !isInterior) {
      for (let i = 0; i < 8; i++) {
        const fx = (seed * 7 + i * 51 + Math.sin(timeSec * 0.9 + i) * 20) % width;
        const fy = 80 + (seed * 13 + i * 31 + Math.cos(timeSec * 0.7 + i) * 15) % 90;
        const pulse = Math.sin(timeSec * 3 + i) * 0.5 + 0.5;

        ctx.fillStyle = `rgba(241, 196, 15, ${0.3 + pulse * 0.7})`;
        ctx.fillRect(fx, fy, 2, 2);
      }
    }

    ctx.restore();
  }

  private renderAtmosphericLighting(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    weather: string,
    timeOfDay: string,
    isInterior: boolean
  ): void {
    if (isInterior) return;

    ctx.save();
    if (timeOfDay === 'night') {
      ctx.fillStyle = 'rgba(10, 18, 40, 0.32)';
      ctx.fillRect(0, 0, width, height);
    } else if (timeOfDay === 'evening') {
      ctx.fillStyle = 'rgba(231, 76, 60, 0.12)';
      ctx.fillRect(0, 0, width, height);
    } else if (timeOfDay === 'morning') {
      ctx.fillStyle = 'rgba(241, 196, 15, 0.08)';
      ctx.fillRect(0, 0, width, height);
    }

    if (weather === 'fog') {
      ctx.fillStyle = 'rgba(215, 230, 245, 0.28)';
      ctx.fillRect(0, 0, width, height);
    }
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
