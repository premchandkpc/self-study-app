import { SemanticEvent } from './events';

export interface TimelineFrame {
  frameId: number;
  timestamp: number;
  events: SemanticEvent[];
}

export class EventTimeline {
  private frames: TimelineFrame[] = [];
  private frameIndex: number = 0;
  private eventIndex: number = 0;

  constructor(events: SemanticEvent[] = []) {
    this.buildTimeline(events);
  }

  private buildTimeline(events: SemanticEvent[]): void {
    const frameMap = new Map<number, SemanticEvent[]>();

    for (const event of events) {
      const frameId = event.frameId ?? 0;
      if (!frameMap.has(frameId)) {
        frameMap.set(frameId, []);
      }
      frameMap.get(frameId)!.push(event);
    }

    this.frames = Array.from(frameMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([frameId, frameEvents]) => ({
        frameId,
        timestamp: frameEvents[0]?.timestamp ?? 0,
        events: frameEvents,
      }));
  }

  currentFrame(): TimelineFrame | null {
    return this.frames[this.frameIndex] ?? null;
  }

  currentEvents(): SemanticEvent[] {
    return this.currentFrame()?.events ?? [];
  }

  nextFrame(): TimelineFrame | null {
    if (this.frameIndex < this.frames.length - 1) {
      this.frameIndex++;
    }
    return this.currentFrame();
  }

  previousFrame(): TimelineFrame | null {
    if (this.frameIndex > 0) {
      this.frameIndex--;
    }
    return this.currentFrame();
  }

  seekToFrame(frameId: number): TimelineFrame | null {
    const index = this.frames.findIndex((f) => f.frameId === frameId);
    if (index >= 0) {
      this.frameIndex = index;
    }
    return this.currentFrame();
  }

  getFrameCount(): number {
    return this.frames.length;
  }

  getCurrentFrameIndex(): number {
    return this.frameIndex;
  }

  getProgress(): number {
    if (this.frames.length === 0) return 0;
    return (this.frameIndex / (this.frames.length - 1)) * 100;
  }

  reset(): void {
    this.frameIndex = 0;
    this.eventIndex = 0;
  }

  canAdvance(): boolean {
    return this.frameIndex < this.frames.length - 1;
  }

  canRewind(): boolean {
    return this.frameIndex > 0;
  }
}
