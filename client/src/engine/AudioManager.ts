export class AudioManager {
  private ctx: AudioContext | null = null;
  public musicVol = 0.5; // default music volume (0.0 to 1.0)
  public sfxVol = 1.0;

  private currentTrackUrl: string | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private fadeInterval: any = null;
  private userInteracted = false;

  constructor() {
    // Setup global interaction listeners to resume audio
    const unlock = () => {
      if (this.userInteracted) return;
      this.userInteracted = true;
      
      // Resume AudioContext if it exists
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(err => console.error('Failed to resume audio context:', err));
      }

      // If there's an audio currently trying to play, try playing it again
      if (this.currentAudio && this.currentAudio.paused) {
        this.currentAudio.play().catch(() => {});
      }

      // Remove event listeners
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('click', unlock);
      document.addEventListener('keydown', unlock);
      document.addEventListener('touchstart', unlock);
    }
  }

  private getCtx(): AudioContext {
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      this.ctx = new AudioContext();
    }
    return this.ctx!;
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(err => console.error('Failed to resume audio context:', err));
    }
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch(() => {});
    }
  }

  playMusic(url: string, fadeDurationMs = 1200): void {
    if (this.currentTrackUrl === url) {
      // Already playing this song!
      return;
    }

    this.currentTrackUrl = url;
    
    // If there is an existing song playing, fade it out first, then load the new one
    if (this.currentAudio) {
      const oldAudio = this.currentAudio;
      this.fadeOutAndStop(oldAudio, fadeDurationMs, () => {
        this.startNewTrack(url, fadeDurationMs);
      });
    } else {
      this.startNewTrack(url, fadeDurationMs);
    }
  }

  private startNewTrack(url: string, fadeDurationMs: number): void {
    if (this.currentTrackUrl !== url) return; // guard against rapid switches

    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0; // start silent for fade in
    this.currentAudio = audio;

    // Play track
    audio.play().catch(err => {
      console.log('[Poke-ter Audio] Autoplay blocked or play failed, will play upon user interaction.', err);
    });

    // Fade in
    let currentVol = 0;
    const steps = 20;
    const intervalTime = fadeDurationMs / steps;
    const targetVol = this.musicVol;

    if (this.fadeInterval) clearInterval(this.fadeInterval);
    
    this.fadeInterval = setInterval(() => {
      if (this.currentAudio !== audio) {
        clearInterval(this.fadeInterval);
        return;
      }
      currentVol += targetVol / steps;
      if (currentVol >= targetVol) {
        audio.volume = targetVol;
        clearInterval(this.fadeInterval);
      } else {
        audio.volume = currentVol;
      }
    }, intervalTime);
  }

  private fadeOutAndStop(audio: HTMLAudioElement, durationMs: number, onComplete: () => void): void {
    let currentVol = audio.volume;
    const steps = 20;
    const intervalTime = durationMs / steps;
    const volStep = currentVol / steps;

    const fadeOutInterval = setInterval(() => {
      currentVol -= volStep;
      if (currentVol <= 0.01) {
        audio.volume = 0;
        audio.pause();
        clearInterval(fadeOutInterval);
        onComplete();
      } else {
        audio.volume = currentVol;
      }
    }, intervalTime);
  }

  stopMusic(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.currentTrackUrl = null;
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  setMusicVolume(volume: number): void {
    this.musicVol = Math.max(0, Math.min(1, volume));
    if (this.currentAudio) {
      this.currentAudio.volume = this.musicVol;
    }
  }
}

