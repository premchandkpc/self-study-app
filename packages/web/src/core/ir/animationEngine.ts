// Animation Engine - Step-by-step playback of IR scenes
// Handles animation sequences, transitions, and timing

import { IRScene, IRAnimation, IRAnimationStep, IRNode } from './schema';

export type AnimationAction =
  | 'highlight'
  | 'fade'
  | 'move'
  | 'transform'
  | 'reveal';

export interface AnimationFrame {
  stepIndex: number;
  elapsed: number;
  progress: number;
  currentState: Map<string, NodeAnimationState>;
  description?: string;
}

export interface NodeAnimationState {
  id: string;
  action: AnimationAction;
  progress: number; // 0-1
  visible: boolean;
  opacity: number; // 0-1
  scale: number; // 1.0 = normal
  highlight: boolean;
}

export class AnimationPlayer {
  private scene: IRScene;
  private animation: IRAnimation | null;
  private currentStepIndex: number = 0;
  private stepStartTime: number = 0;
  private totalTime: number = 0;
  private isPlaying: boolean = false;
  private playbackRate: number = 1;
  private nodeStates: Map<string, NodeAnimationState>;

  constructor(scene: IRScene) {
    this.scene = scene;
    this.animation = scene.animation || null;
    this.nodeStates = new Map();

    // Initialize node states
    this.scene.nodes.forEach((node) => {
      this.nodeStates.set(node.id, {
        id: node.id,
        action: 'reveal',
        progress: 0,
        visible: true,
        opacity: 1,
        scale: 1,
        highlight: false,
      });
    });

    this.totalTime = this.calculateTotalTime();
  }

  private calculateTotalTime(): number {
    if (!this.animation) return 0;

    let total = 0;
    this.animation.steps.forEach((step) => {
      const delay = step.delay || 0;
      total = Math.max(total, delay + step.duration);
    });
    return total;
  }

  play() {
    this.isPlaying = true;
    this.stepStartTime = Date.now();
  }

  pause() {
    this.isPlaying = false;
  }

  reset() {
    this.currentStepIndex = 0;
    this.stepStartTime = 0;
    this.isPlaying = false;
    this.nodeStates.forEach((state) => {
      state.progress = 0;
      state.visible = true;
      state.opacity = 1;
      state.scale = 1;
      state.highlight = false;
    });
  }

  setPlaybackRate(rate: number) {
    this.playbackRate = Math.max(0.1, Math.min(5, rate));
  }

  goToStep(stepIndex: number) {
    if (!this.animation) return;

    this.currentStepIndex = Math.max(
      0,
      Math.min(stepIndex, this.animation.steps.length - 1)
    );
    this.stepStartTime = Date.now();
  }

  getCurrentFrame(): AnimationFrame {
    const elapsed = this.isPlaying ? (Date.now() - this.stepStartTime) / 1000 : 0;
    const scaledElapsed = elapsed * this.playbackRate;

    return {
      stepIndex: this.currentStepIndex,
      elapsed: scaledElapsed,
      progress: this.totalTime > 0 ? scaledElapsed / this.totalTime : 0,
      currentState: new Map(this.nodeStates),
      description: this.getStepDescription(),
    };
  }

  private getStepDescription(): string {
    if (!this.animation || this.currentStepIndex >= this.animation.steps.length) {
      return '';
    }

    const step = this.animation.steps[this.currentStepIndex];
    return `Step ${this.currentStepIndex + 1}: ${step.action} on ${step.id}`;
  }

  update() {
    if (!this.animation || !this.isPlaying) return;

    const elapsed = (Date.now() - this.stepStartTime) / 1000;
    const scaledElapsed = elapsed * this.playbackRate;

    // Update all steps based on current time
    this.animation.steps.forEach((step, idx) => {
      const stepDelay = step.delay || 0;
      const stepDuration = step.duration;

      // Check if this step should be active
      if (scaledElapsed >= stepDelay && scaledElapsed < stepDelay + stepDuration) {
        const stepProgress = (scaledElapsed - stepDelay) / stepDuration;
        this.applyAnimationStep(step, stepProgress);
      } else if (scaledElapsed >= stepDelay + stepDuration) {
        // Step is complete, apply final state
        this.applyAnimationStep(step, 1);
      }
    });

    // Check if animation is complete
    if (scaledElapsed >= this.totalTime && this.animation.loop === false) {
      this.isPlaying = false;
    } else if (scaledElapsed >= this.totalTime && this.animation.loop === true) {
      this.stepStartTime = Date.now();
    }
  }

  private applyAnimationStep(step: IRAnimationStep, progress: number) {
    if (step.target === 'scene') return;

    const state = this.nodeStates.get(step.id);
    if (!state) return;

    state.progress = progress;

    switch (step.action) {
      case 'highlight':
        state.highlight = progress < 1;
        break;

      case 'fade':
        state.opacity = 1 - progress;
        state.visible = progress < 1;
        break;

      case 'reveal':
        state.opacity = progress;
        state.visible = progress > 0;
        break;

      case 'move':
        // Would need target position info
        state.progress = progress;
        break;

      case 'transform':
        state.scale = 1 + (progress * 0.2); // Scale by 20% at max
        break;
    }
  }

  getTotalSteps(): number {
    return this.animation?.steps.length || 0;
  }

  isAnimationComplete(): boolean {
    return !this.isPlaying && this.currentStepIndex >= this.getTotalSteps() - 1;
  }

  getAnimationDuration(): number {
    return this.totalTime;
  }
}

// Helper to create animation from scene structure
export function generateDefaultAnimation(scene: IRScene): IRAnimation {
  const steps: IRAnimationStep[] = [];
  let delay = 0;

  // Reveal nodes in order
  scene.nodes.forEach((node, idx) => {
    steps.push({
      target: 'node',
      id: node.id,
      action: 'reveal',
      duration: 300,
      delay: delay,
    });
    delay += 200;
  });

  // Highlight edges in order
  scene.edges.slice(0, 5).forEach((edge) => {
    steps.push({
      target: 'edge',
      id: edge.id,
      action: 'highlight',
      duration: 500,
      delay: delay,
    });
    delay += 300;
  });

  return {
    duration: delay,
    steps,
    loop: false,
  };
}
