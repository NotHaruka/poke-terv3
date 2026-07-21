export class AudioManager {
  private ctx: AudioContext | null = null;
  musicVol = 0.7; sfxVol = 1.0;
  private getCtx(): AudioContext { if (!this.ctx) this.ctx = new AudioContext(); return this.ctx; }
  resume(): void { if (this.ctx?.state === 'suspended') this.ctx.resume(); }
}
