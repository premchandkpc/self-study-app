export type TickCallback = (frameIndex: number) => void

export interface SchedulerOptions {
  frameDelay?: number
  speed?: number
  direction?: 1 | -1
  loop?: boolean
}

export class Scheduler {
  private frameCount: number
  private frameDelay: number
  private speed: number = 1
  private direction: 1 | -1 = 1
  private loop: boolean = false
  private currentFrame: number = 0
  private animationId: number | null = null
  private lastTick: number = 0
  private running: boolean = false
  private tickCallbacks: Set<TickCallback> = new Set()
  private completeCallbacks: Set<() => void> = new Set()
  private frameCallbacks: Map<number, Set<TickCallback>> = new Map()

  constructor(frameCount: number, options?: SchedulerOptions) {
    this.frameCount = frameCount
    this.frameDelay = options?.frameDelay ?? 300
    this.speed = options?.speed ?? 1
    this.direction = options?.direction ?? 1
    this.loop = options?.loop ?? false
  }

  play(): void {
    if (this.running) return
    if (this.currentFrame >= this.frameCount) {
      if (this.loop) {
        this.currentFrame = 0
      } else {
        return
      }
    }
    this.running = true
    this.lastTick = performance.now()
    this._tick(performance.now())
  }

  pause(): void {
    this.running = false
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  stop(): void {
    this.pause()
    this.currentFrame = 0
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(100, speed))
  }

  setDirection(dir: 1 | -1): void {
    this.direction = dir
  }

  setFrameCount(count: number): void {
    this.frameCount = count
    if (this.currentFrame >= count) {
      this.currentFrame = count > 0 ? count - 1 : 0
    }
  }

  seek(frameIndex: number): boolean {
    if (frameIndex < 0 || frameIndex >= this.frameCount) return false
    this.currentFrame = frameIndex
    this._emitTick()
    return true
  }

  seekToStart(): void {
    this.currentFrame = 0
    this._emitTick()
  }

  seekToEnd(): void {
    this.currentFrame = Math.max(0, this.frameCount - 1)
    this._emitTick()
  }

  reset(): void {
    this.stop()
    this.currentFrame = 0
    this.direction = 1
    this.running = false
  }

  stepForward(): boolean {
    const next = this.currentFrame + 1
    if (next >= this.frameCount) return false
    this.currentFrame = next
    this._emitTick()
    return true
  }

  stepBackward(): boolean {
    const prev = this.currentFrame - 1
    if (prev < 0) return false
    this.currentFrame = prev
    this._emitTick()
    return true
  }

  canAdvance(): boolean {
    return this.currentFrame < this.frameCount - 1
  }

  canRewind(): boolean {
    return this.currentFrame > 0
  }

  getCurrentFrame(): number {
    return this.currentFrame
  }

  getFrameCount(): number {
    return this.frameCount
  }

  getProgress(): number {
    if (this.frameCount === 0) return 100
    return (this.currentFrame / (this.frameCount - 1)) * 100
  }

  isRunning(): boolean {
    return this.running
  }

  getSpeed(): number {
    return this.speed
  }

  getDirection(): 1 | -1 {
    return this.direction
  }

  onTick(cb: TickCallback): () => void {
    this.tickCallbacks.add(cb)
    return () => this.tickCallbacks.delete(cb)
  }

  onComplete(cb: () => void): () => void {
    this.completeCallbacks.add(cb)
    return () => this.completeCallbacks.delete(cb)
  }

  onFrame(frameIndex: number, cb: TickCallback): () => void {
    if (!this.frameCallbacks.has(frameIndex)) {
      this.frameCallbacks.set(frameIndex, new Set())
    }
    this.frameCallbacks.get(frameIndex)!.add(cb)
    return () => this.frameCallbacks.get(frameIndex)?.delete(cb)
  }

  dispose(): void {
    this.pause()
    this.tickCallbacks.clear()
    this.completeCallbacks.clear()
    this.frameCallbacks.clear()
  }

  private _tick(now: number): void {
    if (!this.running) return

    const elapsed = now - this.lastTick
    const adjustedDelay = this.frameDelay / this.speed

    if (elapsed >= adjustedDelay) {
      this.lastTick = now
      const nextFrame = this.currentFrame + this.direction

      if (nextFrame < 0 || nextFrame >= this.frameCount) {
        if (this.loop) {
          this.currentFrame = nextFrame < 0 ? this.frameCount - 1 : 0
        } else {
          if (this.direction === 1 && this.currentFrame >= this.frameCount - 1) {
            this.running = false
            for (const cb of this.completeCallbacks) cb()
            return
          }
          if (this.direction === -1 && this.currentFrame <= 0) {
            this.running = false
            for (const cb of this.completeCallbacks) cb()
            return
          }
          this.pause()
          return
        }
      } else {
        this.currentFrame = nextFrame
      }

      this._emitTick()
    }

    this.animationId = requestAnimationFrame((t) => this._tick(t))
  }

  private _emitTick(): void {
    for (const cb of this.tickCallbacks) {
      cb(this.currentFrame)
    }
    const frameSpecific = this.frameCallbacks.get(this.currentFrame)
    if (frameSpecific) {
      for (const cb of frameSpecific) {
        cb(this.currentFrame)
      }
    }
  }
}
