export class AudioManager {
  private ctx: AudioContext | null = null;
  public musicVol = 0.5; // default music volume (0.0 to 1.0)
  public sfxVol = 1.0;

  private currentTrackUrl: string | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private fadeInterval: any = null;
  private userInteracted = false;

  constructor() {
    // Persistent global interaction listeners to resume audio context and music robustly
    const resumeAudio = () => {
      this.userInteracted = true;
      
      // Resume AudioContext if it exists
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      // If there's an audio currently assigned but paused, resume it
      if (this.currentAudio && this.currentAudio.paused && this.currentTrackUrl) {
        this.currentAudio.play().catch(() => {});
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('click', resumeAudio);
      document.addEventListener('keydown', resumeAudio);
      document.addEventListener('touchstart', resumeAudio);
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

    const oldAudio = this.currentAudio;
    this.currentTrackUrl = url;

    // Instantiating and playing the new audio immediately ensures we stay within the browser's user gesture window
    const newAudio = new Audio(url);
    newAudio.loop = true;
    newAudio.volume = 0; // start silent for fade in
    this.currentAudio = newAudio;

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    newAudio.play().catch(err => {
      console.log('[Poke-ter Audio] Autoplay blocked or play failed, will play upon user interaction.', err);
    });

    // Fade out and stop the old track if it exists
    if (oldAudio) {
      this.fadeOutAndStop(oldAudio, fadeDurationMs, () => {});
    }

    // Fade in the new audio
    let currentVol = 0;
    const steps = 20;
    const intervalTime = fadeDurationMs / steps;
    const targetVol = this.musicVol;

    if (this.fadeInterval) clearInterval(this.fadeInterval);
    
    this.fadeInterval = setInterval(() => {
      if (this.currentAudio !== newAudio) {
        clearInterval(this.fadeInterval);
        return;
      }
      currentVol += targetVol / steps;
      if (currentVol >= targetVol) {
        newAudio.volume = targetVol;
        clearInterval(this.fadeInterval);
      } else {
        newAudio.volume = currentVol;
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

  playSFX(type: 'open' | 'close' | 'select' | 'cancel' | 'bump'): void {
    const context = this.getCtx();
    if (!context || context.state === 'suspended') return;
    
    const osc = context.createOscillator();
    const gainNode = context.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(context.destination);
    
    const now = context.currentTime;
    
    // SFX volume scaling
    const vol = this.sfxVol * 0.2;
    
    switch (type) {
      case 'open':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(vol, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case 'close':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(vol, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case 'select':
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(800, now + 0.05);
        gainNode.gain.setValueAtTime(vol * 0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'cancel':
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        gainNode.gain.setValueAtTime(vol * 0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case 'bump':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        gainNode.gain.setValueAtTime(vol, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
    }
  }

  playSound(sound: string, volume = 0.5): void {
    if (this.sfxVol <= 0) return;

    const lower = sound.toLowerCase();
    if (lower === 'open' || lower.includes('open')) {
      this.playSFX('open');
      return;
    }
    if (lower === 'close' || lower.includes('close')) {
      this.playSFX('close');
      return;
    }
    if (lower === 'select' || lower.includes('select') || lower.includes('move')) {
      this.playSFX('select');
      return;
    }
    if (lower === 'cancel' || lower.includes('cancel')) {
      this.playSFX('cancel');
      return;
    }
    if (lower === 'bump' || lower.includes('bump')) {
      this.playSFX('bump');
      return;
    }

    if (lower.includes('fanfare')) {
      this.playFanfare();
      return;
    }

    try {
      const audio = new Audio(sound);
      audio.volume = Math.max(0, Math.min(1, volume * this.sfxVol));
      audio.play().catch(() => {
        this.playSFX('select');
      });
    } catch {
      this.playSFX('select');
    }
  }

  private playFanfare(): void {
    const context = this.getCtx();
    if (!context || context.state === 'suspended') return;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    const now = context.currentTime;
    const vol = this.sfxVol * 0.2;

    notes.forEach((freq, idx) => {
      const osc = context.createOscillator();
      const gainNode = context.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      osc.connect(gainNode);
      gainNode.connect(context.destination);

      const startTime = now + idx * 0.1;
      const duration = idx === notes.length - 1 ? 0.3 : 0.08;

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(vol, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }
}

