/** Central registry for standard animation clips and preset definitions */

import { AnimationClip } from '../animation/AnimationController.js';

export class AnimationRegistry {
  private static clips = new Map<string, AnimationClip>();

  static initDefaultClips(): void {
    // 4-frame human walk cycle (Down, Up, Left, Right)
    this.register({
      name: 'human_walk',
      loop: true,
      frames: [
        { frameIndex: 0, durationMs: 150 },
        { frameIndex: 1, durationMs: 150 },
        { frameIndex: 2, durationMs: 150 },
        { frameIndex: 3, durationMs: 150 },
      ],
    });

    // Human run cycle
    this.register({
      name: 'human_run',
      loop: true,
      frames: [
        { frameIndex: 0, durationMs: 90 },
        { frameIndex: 1, durationMs: 90 },
        { frameIndex: 2, durationMs: 90 },
        { frameIndex: 3, durationMs: 90 },
      ],
    });

    // Human idle cycle
    this.register({
      name: 'human_idle',
      loop: true,
      frames: [
        { frameIndex: 0, durationMs: 800 },
        { frameIndex: 1, durationMs: 200 }, // subtle breath/blink
      ],
    });

    // Water flow animation (4 frames ping-pong)
    this.register({
      name: 'water_flow',
      loop: true,
      pingPong: true,
      frames: [
        { frameIndex: 0, durationMs: 300 },
        { frameIndex: 1, durationMs: 300 },
        { frameIndex: 2, durationMs: 300 },
        { frameIndex: 3, durationMs: 300 },
      ],
    });

    // Flower swaying
    this.register({
      name: 'flower_sway',
      loop: true,
      frames: [
        { frameIndex: 0, durationMs: 600 },
        { frameIndex: 1, durationMs: 600 },
        { frameIndex: 2, durationMs: 600 },
      ],
    });

    // UI cursor pulse
    this.register({
      name: 'ui_cursor_pulse',
      loop: true,
      pingPong: true,
      frames: [
        { frameIndex: 0, durationMs: 250, offsetX: 0 },
        { frameIndex: 1, durationMs: 250, offsetX: 2 },
      ],
    });
  }

  static register(clip: AnimationClip): void {
    this.clips.set(clip.name, clip);
  }

  static get(clipName: string): AnimationClip | undefined {
    if (this.clips.size === 0) {
      this.initDefaultClips();
    }
    return this.clips.get(clipName);
  }
}
