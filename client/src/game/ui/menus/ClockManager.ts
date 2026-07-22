import { GAME_WIDTH, GAME_HEIGHT } from 'poke-ter-shared';

export class ClockManager {
  private inGameMinutes: number = 0;
  private timeSpeed: number = 60; // 1 real second = 60 in-game seconds
  private serverStartTime: number = Date.now();

  constructor() {
    this.update();
  }

  setServerStartTime(startTime: number) {
    this.serverStartTime = startTime;
    this.update();
  }

  update(dt?: number): void {
    const uptimeMs = Date.now() - this.serverStartTime;
    const uptimeMinutes = (uptimeMs / 1000 * this.timeSpeed) / 60;
    this.inGameMinutes = (8 * 60 + uptimeMinutes) % (24 * 60);
  }

  getTimeString(use24Hour: boolean = false): string {
    let hours = Math.floor(this.inGameMinutes / 60);
    const minutes = Math.floor(this.inGameMinutes % 60);
    let ampm = '';

    if (!use24Hour) {
      ampm = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12;
      if (hours === 0) hours = 12;
    }

    const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${minStr}${ampm}`;
  }
}
