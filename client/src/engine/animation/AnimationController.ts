/** Stateful, direction-aware animation controller for entities, players, monsters, and UI */

import { Direction } from 'poke-ter-shared';

export interface FrameDefinition {
  frameIndex: number;
  durationMs: number;
  offsetX?: number;
  offsetY?: number;
}

export interface AnimationClip {
  name: string;
  frames: FrameDefinition[];
  loop: boolean;
  pingPong?: boolean;
}

export class AnimationController {
  private clips = new Map<string, AnimationClip>();
  private currentClipName: string | null = null;
  private currentFrameIndex = 0;
  private timerMs = 0;
  private playing = true;
  private isReversing = false;
  private onCompleteCallback?: () => void;

  /** Direction mapping helper */
  direction: Direction = 'down';

  registerClip(clip: AnimationClip): void {
    this.clips.set(clip.name, clip);
  }

  play(clipName: string, forceRestart = false, onComplete?: () => void): void {
    if (this.currentClipName === clipName && !forceRestart) return;

    const clip = this.clips.get(clipName);
    if (!clip) return;

    this.currentClipName = clipName;
    this.currentFrameIndex = 0;
    this.timerMs = 0;
    this.playing = true;
    this.isReversing = false;
    this.onCompleteCallback = onComplete;
  }

  update(dtMs: number, speedMultiplier = 1.0): void {
    if (!this.playing || !this.currentClipName) return;

    const clip = this.clips.get(this.currentClipName);
    if (!clip || clip.frames.length === 0) return;

    const currentFrame = clip.frames[this.currentFrameIndex];
    if (!currentFrame) return;

    this.timerMs += dtMs * speedMultiplier;

    if (this.timerMs >= currentFrame.durationMs) {
      this.timerMs -= currentFrame.durationMs;

      if (clip.pingPong) {
        if (this.isReversing) {
          this.currentFrameIndex--;
          if (this.currentFrameIndex < 0) {
            this.currentFrameIndex = 1;
            this.isReversing = false;
          }
        } else {
          this.currentFrameIndex++;
          if (this.currentFrameIndex >= clip.frames.length) {
            this.currentFrameIndex = clip.frames.length - 2;
            this.isReversing = true;
          }
        }
      } else {
        this.currentFrameIndex++;
        if (this.currentFrameIndex >= clip.frames.length) {
          if (clip.loop) {
            this.currentFrameIndex = 0;
          } else {
            this.currentFrameIndex = clip.frames.length - 1;
            this.playing = false;
            if (this.onCompleteCallback) {
              this.onCompleteCallback();
            }
          }
        }
      }
    }
  }

  getCurrentFrame(): FrameDefinition | null {
    if (!this.currentClipName) return null;
    const clip = this.clips.get(this.currentClipName);
    if (!clip || clip.frames.length === 0) return null;
    return clip.frames[this.currentFrameIndex] || clip.frames[0];
  }

  getCurrentFrameIndex(): number {
    const frame = this.getCurrentFrame();
    return frame ? frame.frameIndex : 0;
  }

  getCurrentClipName(): string | null {
    return this.currentClipName;
  }
}
