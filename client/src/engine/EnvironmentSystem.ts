export class EnvironmentSystem {
  public time: number = 0;
  public windStrength: number = 0.5;
  public windDirectionX: number = 1.0;
  public windDirectionY: number = 0.2;
  public weather: 'clear' | 'rain' | 'storm' | 'snow' = 'clear';

  public update(dt: number) {
    this.time += dt;
    // Slow wind variation
    this.windStrength = 0.5 + Math.sin(this.time * 0.0002) * 0.4;
    const angle = this.time * 0.0001;
    this.windDirectionX = Math.cos(angle);
    this.windDirectionY = Math.sin(angle * 0.7) * 0.3;
  }

  // Get a procedural sway offset based on world coordinates
  public getSwayOffset(worldX: number, worldY: number, frequency: number, amplitude: number, phaseOffset: number = 0): number {
    const spatialPhase = (worldX * this.windDirectionX + worldY * this.windDirectionY) * 0.02;
    return Math.sin(this.time * frequency + spatialPhase + phaseOffset) * amplitude * this.windStrength;
  }
}

export const envSystem = new EnvironmentSystem();
