export class AudioManager {
  private ctx: AudioContext | null = null;
  public musicVol = 0.5; // default music volume (0.0 to 1.0)
  public sfxVol = 1.0;

  private currentTrackUrl: string | null = null;
  private pendingMusicUrl: string | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private fadeInterval: any = null;
  public userInteracted = false;

  constructor() {
    this.attachInteractionListeners();
  }

  public attachInteractionListeners(): void {
    if (typeof document === 'undefined') return;

    const resumeAudio = () => {
      this.userInteracted = true;
      
      // Resume AudioContext if it exists or initialize one
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      } else if (!this.ctx && typeof AudioContext !== 'undefined') {
        this.ctx = new AudioContext();
        this.ctx.resume().catch(() => {});
      }

      const trackToPlay = this.pendingMusicUrl || this.currentTrackUrl || '/sunlit_safari.mp3';
      this.pendingMusicUrl = null;
      this.playMusic(trackToPlay);

      // Play a delightful tiny greeting chime on first unlock!
      this.playFanfare();

      document.removeEventListener('click', resumeAudio);
      document.removeEventListener('keydown', resumeAudio);
      document.removeEventListener('touchstart', resumeAudio);
    };

    document.addEventListener('click', resumeAudio, { once: true });
    document.addEventListener('keydown', resumeAudio, { once: true });
    document.addEventListener('touchstart', resumeAudio, { once: true });
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
    if (!this.userInteracted) {
      this.currentTrackUrl = url;
      this.pendingMusicUrl = url;
      return;
    }

    if (this.currentAudio && this.currentTrackUrl === url && !this.currentAudio.paused) {
      // Already playing this exact song!
      return;
    }

    this.currentTrackUrl = url;

    const oldAudio = this.currentAudio;

    // Instantiating and playing the new audio
    const newAudio = new Audio(url);
    newAudio.loop = true;
    newAudio.volume = this.musicVol; // Set volume directly so music is immediately audible
    this.currentAudio = newAudio;

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const playPromise = newAudio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.pendingMusicUrl = null;
      }).catch(err => {
        console.warn('[Poke-ter Audio] Autoplay blocked or play failed, will retry on next user interaction.', err);
        this.pendingMusicUrl = url;
        this.userInteracted = false;
        this.attachInteractionListeners();
      });
    }

    // Fade out and stop the old track if it exists
    if (oldAudio && oldAudio !== newAudio) {
      this.fadeOutAndStop(oldAudio, fadeDurationMs, () => {});
    }
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

