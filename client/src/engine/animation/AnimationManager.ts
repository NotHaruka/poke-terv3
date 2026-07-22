/** Centralized manager for instantiating and updating active AnimationControllers */

import { AnimationController } from './AnimationController.js';
import { AnimationRegistry } from '../registries/AnimationRegistry.js';

export class AnimationManager {
  private static instance: AnimationManager;
  private activeControllers = new Set<AnimationController>();

  static getInstance(): AnimationManager {
    if (!this.instance) {
      this.instance = new AnimationManager();
    }
    return this.instance;
  }

  createController(): AnimationController {
    const controller = new AnimationController();
    
    // Auto-register default clips
    const walkClip = AnimationRegistry.get('human_walk');
    const runClip = AnimationRegistry.get('human_run');
    const idleClip = AnimationRegistry.get('human_idle');

    if (walkClip) controller.registerClip(walkClip);
    if (runClip) controller.registerClip(runClip);
    if (idleClip) controller.registerClip(idleClip);

    this.activeControllers.add(controller);
    return controller;
  }

  removeController(controller: AnimationController): void {
    this.activeControllers.delete(controller);
  }

  updateAll(dtMs: number): void {
    for (const controller of this.activeControllers) {
      controller.update(dtMs);
    }
  }
}
