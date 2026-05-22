export type PlaybackState = 'idle' | 'playing' | 'paused' | 'completed';

export interface PlaybackConfig {
  speed: number; // 0.5, 1, 1.5, 2
  loop: boolean;
  frameDelay: number; // ms between frames
}

export class PlaybackEngine {
  private state: PlaybackState = 'idle';
  private speed: number = 1;
  private frameDelay: number = 300; // ms
  private loop: boolean = false;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;

  private onFrame: (() => void) | null = null;
  private onStateChange: ((state: PlaybackState) => void) | null = null;

  constructor(config: Partial<PlaybackConfig> = {}) {
    this.speed = config.speed ?? 1;
    this.frameDelay = config.frameDelay ?? 300;
    this.loop = config.loop ?? false;
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(5, speed));
  }

  setFrameDelay(delay: number): void {
    this.frameDelay = Math.max(50, delay);
  }

  setLoop(loop: boolean): void {
    this.loop = loop;
  }

  getState(): PlaybackState {
    return this.state;
  }

  getSpeed(): number {
    return this.speed;
  }

  play(): void {
    if (this.state === 'playing') return;

    this.setState('playing');
    this.lastFrameTime = 0;
    this.startAnimation();
  }

  pause(): void {
    if (this.state !== 'playing') return;

    this.setState('paused');
    this.stopAnimation();
  }

  resume(): void {
    this.play();
  }

  stop(): void {
    this.setState('idle');
    this.stopAnimation();
  }

  // Attach callbacks
  onFrameStep(callback: () => void): void {
    this.onFrame = callback;
  }

  onPlaybackStateChange(callback: (state: PlaybackState) => void): void {
    this.onStateChange = callback;
  }

  private setState(newState: PlaybackState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.onStateChange?.(newState);
    }
  }

  private startAnimation(): void {
    if (this.animationFrameId !== null) return;

    const tick = (currentTime: number) => {
      if (this.lastFrameTime === 0) {
        this.lastFrameTime = currentTime;
      }

      const elapsed = currentTime - this.lastFrameTime;
      const effectiveDelay = this.frameDelay / this.speed;

      if (elapsed >= effectiveDelay) {
        this.lastFrameTime = currentTime;
        this.onFrame?.();
      }

      if (this.state === 'playing') {
        this.animationFrameId = requestAnimationFrame(tick);
      }
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  private stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      this.lastFrameTime = 0;
    }
  }

  complete(): void {
    this.setState('completed');
    this.stopAnimation();
  }
}
