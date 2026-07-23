/**
 * MusicManager
 * Centralized, persistent manager for background music state, transitions, and environmental triggers.
 */

import { AudioManager } from './AudioManager.js';

export enum MusicState {
  Stopped = 'stopped',
  Playing = 'playing',
  FadingOut = 'fading_out',
  FadingIn = 'fading_in',
}

export enum BattleState {
  None = 'none',
  Wild = 'wild',
  Trainer = 'trainer',
  Boss = 'boss',
  Legendary = 'legendary',
}

export class MusicManager {
  private static instance: MusicManager | null = null;

  public audioManager: AudioManager;

  // Track & Playback State
  public currentTrack: string | null = null;
  public previousTrack: string | null = null;
  public musicState: MusicState = MusicState.Stopped;
  public battleState: BattleState = BattleState.None;

  // Environmental State
  public biome: string = 'plains';
  public route: string = 'city';
  public town: string = 'city';
  public interior: string | null = null;
  public weather: 'clear' | 'rain' | 'storm' | 'snow' = 'clear';
  public timeOfDay: 'morning' | 'day' | 'evening' | 'night' = 'day';
  public currentScene: string = 'title';

  // Internal reference for the HTMLAudioElement
  private currentAudio: HTMLAudioElement | null = null;
  private fadeIntervals: Set<any> = new Set();

  constructor(audioManager: AudioManager) {
    this.audioManager = audioManager;
    MusicManager.instance = this;
  }

  public static getInstance(): MusicManager | null {
    return MusicManager.instance;
  }

  /**
   * Play a specific track with smooth fade out of the old track and fade in of the new one (crossfade).
   */
  public playTrack(url: string, fadeDurationMs = 1200, forceRestart = false): void {
    if (!this.audioManager.userInteracted) {
      this.currentTrack = url;
      return;
    }

    if (this.currentTrack === url && this.currentAudio && !this.currentAudio.paused && !forceRestart) {
      this.updateVolume();
      return;
    }

    this.previousTrack = this.currentTrack;
    this.currentTrack = url;

    const oldAudio = this.currentAudio;
    const newAudio = new Audio(url);
    newAudio.loop = true;
    newAudio.volume = 0; // start silent for fade in
    this.currentAudio = newAudio;

    // Clear any previous track fade intervals to avoid race conditions or overlaps
    this.clearAllFades();

    const playPromise = newAudio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.musicState = MusicState.Playing;
        this.fadeIn(newAudio, fadeDurationMs);
      }).catch(err => {
        console.warn('[MusicManager] Autoplay blocked or play failed. Will play on next user interaction.', err);
        this.musicState = MusicState.Stopped;
      });
    }

    if (oldAudio && oldAudio !== newAudio) {
      this.fadeOutAndStop(oldAudio, fadeDurationMs);
    }
  }

  /**
   * Stop any currently playing background music immediately.
   */
  public stopMusic(): void {
    this.clearAllFades();
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.currentTrack = null;
    this.musicState = MusicState.Stopped;
  }

  /**
   * Resume background music if it is paused and user has interacted.
   */
  public resume(): void {
    if (this.currentAudio && this.currentAudio.paused && this.audioManager.userInteracted) {
      this.currentAudio.play().catch(() => {});
    }
  }

  /**
   * Fade in the music smoothly.
   */
  private fadeIn(audio: HTMLAudioElement, durationMs: number): void {
    this.musicState = MusicState.FadingIn;
    
    // Determine appropriate target volume
    let targetVolume = this.audioManager.musicVol;
    if (this.timeOfDay === 'night') {
      targetVolume *= 0.7; // Cozy softer volume at night
    }

    let currentVol = 0;
    const steps = 30;
    const intervalTime = durationMs / steps;
    const volStep = targetVolume / steps;

    const interval = setInterval(() => {
      currentVol += volStep;
      if (currentVol >= targetVolume) {
        audio.volume = targetVolume;
        this.musicState = MusicState.Playing;
        clearInterval(interval);
        this.fadeIntervals.delete(interval);
      } else {
        audio.volume = currentVol;
      }
    }, intervalTime);

    this.fadeIntervals.add(interval);
  }

  /**
   * Fade out a track and stop/pause it when silent.
   */
  private fadeOutAndStop(audio: HTMLAudioElement, durationMs: number): void {
    let currentVol = audio.volume;
    const steps = 30;
    const intervalTime = durationMs / steps;
    const volStep = currentVol / steps;

    const interval = setInterval(() => {
      currentVol -= volStep;
      if (currentVol <= 0.01) {
        audio.volume = 0;
        audio.pause();
        clearInterval(interval);
        this.fadeIntervals.delete(interval);
      } else {
        audio.volume = Math.max(0, currentVol);
      }
    }, intervalTime);

    this.fadeIntervals.add(interval);
  }

  /**
   * Clear all active fade intervals.
   */
  private clearAllFades(): void {
    for (const interval of this.fadeIntervals) {
      clearInterval(interval);
    }
    this.fadeIntervals.clear();
  }

  /**
   * Dynamically evaluates the current state and returns the correct track URL.
   */
  public getCorrectTrackForEnvironment(): string {
    if (this.currentScene === 'title') {
      return '/morning_in_the_village.mp3'; // Or title screen music
    }

    if (this.currentScene === 'character_creation') {
      return '/morning_in_the_village.mp3';
    }

    if (this.currentScene === 'battle') {
      return '/sunlit_safari.mp3';
    }

    // Overworld scene music evaluation
    if (this.interior) {
      if (this.interior.includes('pokecenter') || this.interior.includes('lab') || this.interior.includes('pokecenter_interior')) {
        return '/morning_in_the_village.mp3';
      }
      if (this.interior.includes('mart') || this.interior.includes('pokemart_interior')) {
        return '/lanterns_at_home.mp3';
      }
      return '/morning_in_the_village.mp3';
    }

    if (this.biome === 'city' || this.route === 'city' || this.town === 'city') {
      return '/morning_in_the_village.mp3';
    }

    // Default to Route theme
    return '/lanterns_at_home.mp3';
  }

  /**
   * Transition to Battle music smoothly.
   */
  public enterBattle(state: BattleState = BattleState.Trainer): void {
    this.battleState = state;
    this.currentScene = 'battle';
    const battleTrack = this.getCorrectTrackForEnvironment();
    this.playTrack(battleTrack, 600); // 600ms transition for battle
  }

  /**
   * Exit Battle and transition back to correct environmental music smoothly.
   */
  public exitBattle(): void {
    this.battleState = BattleState.None;
    this.currentScene = 'overworld';
    const correctTrack = this.getCorrectTrackForEnvironment();
    this.playTrack(correctTrack, 1000); // 1000ms transition for return
  }

  /**
   * Updates background music if the correct track has changed.
   */
  public updateEnvironmentalMusic(): void {
    const correctTrack = this.getCorrectTrackForEnvironment();
    this.playTrack(correctTrack);
  }

  /**
   * Dynamically adjusts the volume of the playing track (e.g. softer at night or when muted).
   */
  public updateVolume(): void {
    if (!this.currentAudio) return;
    
    let baseVolume = this.audioManager.musicVol;
    
    // Softer music at night for cozy ambient feel
    if (this.timeOfDay === 'night') {
      baseVolume *= 0.7;
    }
    
    this.currentAudio.volume = baseVolume;
  }

  /**
   * Updates state parameters and triggers any corresponding music/volume adjustments.
   */
  public updateState(params: {
    scene?: string;
    biome?: string;
    route?: string;
    town?: string;
    interior?: string | null;
    weather?: 'clear' | 'rain' | 'storm' | 'snow';
    timeOfDay?: 'morning' | 'day' | 'evening' | 'night';
  }): void {
    let changed = false;

    if (params.scene !== undefined && params.scene !== this.currentScene) {
      this.currentScene = params.scene;
      changed = true;
    }
    if (params.biome !== undefined && params.biome !== this.biome) {
      this.biome = params.biome;
      changed = true;
    }
    if (params.route !== undefined && params.route !== this.route) {
      this.route = params.route;
      changed = true;
    }
    if (params.town !== undefined && params.town !== this.town) {
      this.town = params.town;
      changed = true;
    }
    if (params.interior !== undefined && params.interior !== this.interior) {
      this.interior = params.interior;
      changed = true;
    }
    if (params.weather !== undefined && params.weather !== this.weather) {
      this.weather = params.weather;
      changed = true;
    }
    if (params.timeOfDay !== undefined && params.timeOfDay !== this.timeOfDay) {
      this.timeOfDay = params.timeOfDay;
      changed = true;
    }

    if (changed) {
      this.updateEnvironmentalMusic();
    } else {
      this.updateVolume();
    }
  }
}
