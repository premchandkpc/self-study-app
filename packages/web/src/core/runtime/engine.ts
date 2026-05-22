import { SemanticEvent } from './events';
import { EventTimeline, TimelineFrame } from './timeline';
import { PlaybackEngine, PlaybackState } from './playback';
import { EventEmitter } from '../events/EventEmitter';

export interface RuntimeConfig {
  frameDelay?: number;
  speed?: number;
  loop?: boolean;
}

export type RuntimeState = 'idle' | 'playing' | 'paused' | 'completed' | 'error';

export class VisualizationEngine extends EventEmitter {
  private timeline: EventTimeline;
  private playback: PlaybackEngine;
  private eventLog: SemanticEvent[] = [];
  private runtimeState: RuntimeState = 'idle';

  constructor(events: SemanticEvent[] = [], config: RuntimeConfig = {}) {
    super();
    this.timeline = new EventTimeline(events);
    this.playback = new PlaybackEngine({
      frameDelay: config.frameDelay ?? 300,
      speed: config.speed ?? 1,
      loop: config.loop ?? false,
    });

    this.eventLog = events;
    this.setupPlayback();
  }

  private setupPlayback(): void {
    this.playback.onFrameStep(() => this.advanceFrame());
    this.playback.onPlaybackStateChange((state) => this.onPlaybackStateChanged(state));
  }

  // Public API: Playback control
  play(): void {
    this.playback.play();
  }

  pause(): void {
    this.playback.pause();
  }

  stop(): void {
    this.playback.stop();
  }

  setSpeed(speed: number): void {
    this.playback.setSpeed(speed);
    this.emit('speedChanged', speed);
  }

  setFrameDelay(delay: number): void {
    this.playback.setFrameDelay(delay);
  }

  // Frame navigation
  nextFrame(): TimelineFrame | null {
    const frame = this.timeline.nextFrame();
    if (frame) {
      this.emitFrameUpdate(frame);
      if (!this.timeline.canAdvance()) {
        this.playback.complete();
        this.runtimeState = 'completed';
        this.emit('completed');
      }
    }
    return frame;
  }

  previousFrame(): TimelineFrame | null {
    const frame = this.timeline.previousFrame();
    if (frame) {
      this.emitFrameUpdate(frame);
    }
    return frame;
  }

  seekToFrame(frameId: number): TimelineFrame | null {
    const frame = this.timeline.seekToFrame(frameId);
    if (frame) {
      this.emitFrameUpdate(frame);
    }
    return frame;
  }

  // Getters
  getCurrentFrame(): TimelineFrame | null {
    return this.timeline.currentFrame();
  }

  getCurrentEvents(): SemanticEvent[] {
    return this.timeline.currentEvents();
  }

  getFrameCount(): number {
    return this.timeline.getFrameCount();
  }

  getCurrentFrameIndex(): number {
    return this.timeline.getCurrentFrameIndex();
  }

  getProgress(): number {
    return this.timeline.getProgress();
  }

  getPlaybackState(): PlaybackState {
    return this.playback.getState();
  }

  getRuntimeState(): RuntimeState {
    return this.runtimeState;
  }

  getSpeed(): number {
    return this.playback.getSpeed();
  }

  // Event handling
  addEvent(event: SemanticEvent): void {
    this.eventLog.push(event);
    this.timeline = new EventTimeline(this.eventLog);
  }

  getEventLog(): SemanticEvent[] {
    return [...this.eventLog];
  }

  // Replay
  replay(): void {
    this.timeline.reset();
    this.playback.stop();
    this.runtimeState = 'idle';
    this.emit('reset');
  }

  canAdvance(): boolean {
    return this.timeline.canAdvance();
  }

  canRewind(): boolean {
    return this.timeline.canRewind();
  }

  // Private methods
  private advanceFrame(): void {
    if (this.timeline.canAdvance()) {
      this.nextFrame();
    } else if (this.playback.getState() === 'playing') {
      this.playback.complete();
      this.runtimeState = 'completed';
      this.emit('completed');
    }
  }

  private emitFrameUpdate(frame: TimelineFrame): void {
    this.runtimeState = 'playing';
    this.emit('frameUpdate', {
      frameId: frame.frameId,
      events: frame.events,
      progress: this.getProgress(),
      frameIndex: this.getCurrentFrameIndex(),
      frameCount: this.getFrameCount(),
    });
  }

  private onPlaybackStateChanged(state: PlaybackState): void {
    const stateMap: Record<PlaybackState, RuntimeState> = {
      playing: 'playing',
      paused: 'paused',
      idle: 'idle',
      completed: 'completed',
    };
    this.runtimeState = stateMap[state];
    this.emit('playbackStateChanged', state);
  }
}
