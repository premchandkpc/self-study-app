import { Graph } from '../primitives/Graph'
import type { GraphDiff } from '../primitives/Graph'
import { Timeline } from '../timeline/Timeline'
import type { Frame } from '../timeline/Timeline'
import { Scheduler } from '../scheduler/Scheduler'
import { EventBus } from '../events/EventBus'
import type { RuntimeEvent } from '../events/Event'

export type EngineState = 'idle' | 'running' | 'paused' | 'completed' | 'error'

export interface EngineOptions {
  frameDelay?: number
  speed?: number
  loop?: boolean
  autoBuildFrames?: boolean
}

export class RuntimeEngine {
  private graph: Graph
  private timeline: Timeline
  private scheduler!: Scheduler
  private eventBus: EventBus
  private state: EngineState = 'idle'
  private error: Error | null = null
  private options: EngineOptions
  private frameChangeCallbacks: Set<(frame: Frame) => void> = new Set()
  private stateChangeCallbacks: Set<(state: EngineState) => void> = new Set()
  private graphChangeCallbacks: Set<(diff: GraphDiff) => void> = new Set()
  private eventCallbacks: Set<(event: RuntimeEvent) => void> = new Set()
  private latestFrame: Frame | null = null

  constructor(graph?: Graph, options?: EngineOptions) {
    this.graph = graph ?? new Graph()
    this.timeline = new Timeline()
    this.eventBus = new EventBus()
    this.options = {
      frameDelay: 300,
      speed: 1,
      loop: false,
      autoBuildFrames: true,
      ...options,
    }
    this._initScheduler(0)
  }

  private _initScheduler(frameCount: number): void {
    if (this.scheduler) {
      this.scheduler.dispose()
    }
    this.scheduler = new Scheduler(frameCount, {
      frameDelay: this.options.frameDelay,
      speed: this.options.speed,
      loop: this.options.loop,
    })

    this.scheduler.onTick((frameIndex: number) => {
      const frame = this.timeline.getFrame(frameIndex)
      if (frame) {
        this.latestFrame = frame
        for (const cb of this.frameChangeCallbacks) cb(frame)
      }
    })

    this.scheduler.onComplete(() => {
      this._setState('completed')
    })
  }

  private _setState(newState: EngineState): void {
    const old = this.state
    this.state = newState
    if (old !== newState) {
      for (const cb of this.stateChangeCallbacks) cb(newState)
    }
  }

  ingest(event: RuntimeEvent): void {
    this.eventBus.emit(event)
    this.timeline.addEvent(event)
    for (const cb of this.eventCallbacks) cb(event)

    if (this.options.autoBuildFrames) {
      this.timeline.buildFrames()
      this.scheduler.setFrameCount(this.timeline.frameCount())
    }
  }

  ingestBatch(events: RuntimeEvent[]): void {
    for (const event of events) {
      this.eventBus.emit(event)
      this.timeline.addEvent(event)
    }
    for (const cb of this.eventCallbacks) {
      for (const event of events) cb(event)
    }

    if (this.options.autoBuildFrames) {
      this.timeline.buildFrames()
      this.scheduler.setFrameCount(this.timeline.frameCount())
    }
  }

  build(): void {
    this.timeline.buildFrames()
    this.scheduler.setFrameCount(this.timeline.frameCount())
  }

  start(): void {
    if (this.state === 'running') return
    this._setState('idle')
    this.timeline.buildFrames()
    this.scheduler.setFrameCount(this.timeline.frameCount())
    this._setState('paused')
  }

  play(speed?: number): void {
    if (speed !== undefined) {
      this.scheduler.setSpeed(speed)
      this.options.speed = speed
    }
    if (this.timeline.frameCount() === 0) {
      this.timeline.buildFrames()
      this.scheduler.setFrameCount(this.timeline.frameCount())
    }
    this.scheduler.play()
    this._setState('running')
  }

  pause(): void {
    this.scheduler.pause()
    this._setState('paused')
  }

  resume(): void {
    this.scheduler.play()
    this._setState('running')
  }

  stop(): void {
    this.scheduler.stop()
    this._setState('idle')
  }

  reset(): void {
    this.scheduler.reset()
    this.timeline.clear()
    this.graph.reset()
    this.eventBus.clearHistory()
    this.latestFrame = null
    this.error = null
    this._setState('idle')
  }

  seek(frameIndex: number): boolean {
    const frame = this.timeline.seek(frameIndex)
    if (frame) {
      const idx = this.timeline.indexOf(frameIndex)
      if (idx >= 0) this.scheduler.seek(idx)
      this.latestFrame = frame
      for (const cb of this.frameChangeCallbacks) cb(frame)
      return true
    }
    return false
  }

  stepForward(): boolean {
    const result = this.scheduler.stepForward()
    this._setState('paused')
    return result
  }

  stepBackward(): boolean {
    const result = this.scheduler.stepBackward()
    this._setState('paused')
    return result
  }

  setSpeed(speed: number): void {
    this.options.speed = speed
    this.scheduler.setSpeed(speed)
  }

  setLoop(loop: boolean): void {
    this.options.loop = loop
  }

  getCurrentFrame(): Frame | null {
    return this.latestFrame ?? this.timeline.getFrame(this.scheduler.getCurrentFrame())
  }

  getCurrentGraph(): Graph {
    const frame = this.getCurrentFrame()
    return frame?.state ?? this.graph
  }

  getTimeline(): Timeline {
    return this.timeline
  }

  getScheduler(): Scheduler {
    return this.scheduler
  }

  getEventBus(): EventBus {
    return this.eventBus
  }

  getState(): EngineState {
    return this.state
  }

  getFrameCount(): number {
    return this.timeline.frameCount()
  }

  getCurrentFrameIndex(): number {
    return this.scheduler.getCurrentFrame()
  }

  getProgress(): number {
    return this.scheduler.getProgress()
  }

  getError(): Error | null {
    return this.error
  }

  canAdvance(): boolean {
    return this.scheduler.canAdvance()
  }

  canRewind(): boolean {
    return this.scheduler.canRewind()
  }

  setFrameDelay(delay: number): void {
    this.options.frameDelay = delay
  }

  onFrameChange(cb: (frame: Frame) => void): () => void {
    this.frameChangeCallbacks.add(cb)
    return () => this.frameChangeCallbacks.delete(cb)
  }

  onStateChange(cb: (state: EngineState) => void): () => void {
    this.stateChangeCallbacks.add(cb)
    return () => this.stateChangeCallbacks.delete(cb)
  }

  onGraphChange(cb: (diff: GraphDiff) => void): () => void {
    this.graphChangeCallbacks.add(cb)
    return () => this.graphChangeCallbacks.delete(cb)
  }

  onEvent(cb: (event: RuntimeEvent) => void): () => void {
    this.eventCallbacks.add(cb)
    return () => this.eventCallbacks.delete(cb)
  }

  dispose(): void {
    this.scheduler.dispose()
    this.eventBus.removeAllListeners()
    this.frameChangeCallbacks.clear()
    this.stateChangeCallbacks.clear()
    this.graphChangeCallbacks.clear()
    this.eventCallbacks.clear()
    this.timeline.clear()
    this.graph.reset()
    this.latestFrame = null
    this._setState('idle')
  }
}
