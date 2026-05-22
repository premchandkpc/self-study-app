import type { AnimationDescriptor, EasingFunction, Keyframe } from './primitives'
import { applyEasing, interpolate, interpolateColor } from './primitives'

export interface ActiveAnimation {
  id: string
  descriptor: AnimationDescriptor
  progress: number
  elapsed: number
  currentState: Map<string, unknown>
  iterationsCompleted: number
}

export interface EntityAnimationState {
  entityId: string
  activeAnimations: ActiveAnimation[]
  currentValues: Record<string, unknown>
}

export class AnimationEngine {
  private animations: Map<string, ActiveAnimation> = new Map()
  private elapsed: number = 0
  private running: boolean = false
  private lastTick: number = 0
  private rafId: number | null = null
  private tickCallbacks: Set<(deltaMs: number) => void> = new Set()
  private completeCallbacks: Map<string, Set<(id: string) => void>> = new Map()

  animate(descriptor: AnimationDescriptor): string {
    const id = descriptor.id
    const anim: ActiveAnimation = {
      id,
      descriptor,
      progress: 0,
      elapsed: 0,
      currentState: new Map(),
      iterationsCompleted: 0,
    }
    for (const prop of descriptor.properties) {
      anim.currentState.set(prop.property, prop.from)
    }
    this.animations.set(id, anim)
    return id
  }

  parallel(animations: AnimationDescriptor[]): AnimationDescriptor {
    const maxDuration = Math.max(...animations.map(a => a.duration + (a.delay ?? 0)))
    return {
      id: `parallel_${Date.now()}`,
      type: 'interpolate',
      targetIds: animations.flatMap(a => a.targetIds),
      duration: maxDuration,
      easing: 'linear',
      keyframes: [{ time: 0, properties: {} }, { time: 1, properties: {} }],
      properties: [],
    }
  }

  sequence(animations: AnimationDescriptor[]): AnimationDescriptor {
    let totalDuration = 0
    for (const a of animations) {
      a.delay = totalDuration
      totalDuration += a.duration
    }
    return {
      id: `sequence_${Date.now()}`,
      type: 'interpolate',
      targetIds: animations.flatMap(a => a.targetIds),
      duration: totalDuration,
      easing: 'linear',
      keyframes: [{ time: 0, properties: {} }, { time: 1, properties: {} }],
      properties: [],
    }
  }

  chain(...animations: AnimationDescriptor[]): AnimationDescriptor {
    let offset = 0
    for (const a of animations) {
      a.delay = (a.delay ?? 0) + offset
      offset += a.duration + (a.delay ?? 0)
    }
    return {
      id: `chain_${Date.now()}`,
      type: 'interpolate',
      targetIds: animations.flatMap(a => a.targetIds),
      duration: offset,
      easing: 'linear',
      keyframes: [{ time: 0, properties: {} }, { time: 1, properties: {} }],
      properties: [],
    }
  }

  play(): void {
    if (this.running) return
    this.running = true
    this.lastTick = performance.now()
    const tick = (now: number) => {
      if (!this.running) return
      const delta = now - this.lastTick
      this.lastTick = now
      this.tick(delta)
      for (const cb of this.tickCallbacks) cb(delta)
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  pause(): void {
    this.running = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  stop(id?: string): void {
    if (id) {
      this.animations.delete(id)
    } else {
      this.animations.clear()
    }
  }

  seek(progress: number): void {
    const p = Math.max(0, Math.min(1, progress))
    for (const [, anim] of this.animations) {
      anim.progress = p
      anim.elapsed = p * anim.descriptor.duration
      this._applyKeyframes(anim)
    }
  }

  tick(deltaMs: number): void {
    this.elapsed += deltaMs
    const toRemove: string[] = []
    for (const [, anim] of this.animations) {
      const desc = anim.descriptor
      const delay = desc.delay ?? 0
      if (this.elapsed < delay) continue
      const animElapsed = this.elapsed - delay
      anim.elapsed = animElapsed
      anim.progress = Math.min(1, animElapsed / desc.duration)
      this._applyKeyframes(anim)
      if (animElapsed >= desc.duration) {
        const maxIter = desc.iterations ?? 1
        if (maxIter > 0 && anim.iterationsCompleted >= maxIter - 1) {
          toRemove.push(anim.id)
          const cbs = this.completeCallbacks.get(anim.id)
          if (cbs) for (const cb of cbs) cb(anim.id)
        } else {
          anim.iterationsCompleted++
          const dir = desc.direction
          if (dir === 'alternate') {
            anim.progress = 0
          }
          this.elapsed = delay
        }
      }
    }
    for (const id of toRemove) this.animations.delete(id)
  }

  onTick(cb: (deltaMs: number) => void): () => void {
    this.tickCallbacks.add(cb)
    return () => this.tickCallbacks.delete(cb)
  }

  onComplete(id: string, cb: (id: string) => void): () => void {
    if (!this.completeCallbacks.has(id)) this.completeCallbacks.set(id, new Set())
    this.completeCallbacks.get(id)!.add(cb)
    return () => this.completeCallbacks.get(id)?.delete(cb)
  }

  getActiveAnimations(): ActiveAnimation[] {
    return Array.from(this.animations.values())
  }

  getAnimation(id: string): ActiveAnimation | undefined {
    return this.animations.get(id)
  }

  getEntityAnimationState(entityId: string): EntityAnimationState {
    const active: ActiveAnimation[] = []
    const currentValues: Record<string, unknown> = {}
    for (const anim of this.animations.values()) {
      if (anim.descriptor.targetIds.includes(entityId)) {
        active.push(anim)
        for (const [key, val] of anim.currentState) {
          currentValues[key] = val
        }
      }
    }
    return { entityId, activeAnimations: active, currentValues }
  }

  isRunning(): boolean {
    return this.running
  }

  clear(): void {
    this.animations.clear()
    this.elapsed = 0
  }

  dispose(): void {
    this.pause()
    this.clear()
    this.tickCallbacks.clear()
    this.completeCallbacks.clear()
  }

  private _applyKeyframes(anim: ActiveAnimation): void {
    const desc = anim.descriptor
    const p = anim.progress
    for (const prop of desc.properties) {
      const eased = applyEasing(p, prop.interpolator === 'spring' ? 'spring' : desc.easing)
      const from = prop.from as number
      const to = prop.to as number
      if (typeof from === 'number' && typeof to === 'number') {
        const val = interpolate(from, to, p, prop.interpolator === 'ease' ? 'ease-in-out' : desc.easing)
        anim.currentState.set(prop.property, val)
      } else if (typeof from === 'string' && from.startsWith('#')) {
        anim.currentState.set(prop.property, interpolateColor(from, to as string, eased))
      } else {
        anim.currentState.set(prop.property, p >= 1 ? to : from)
      }
    }
    for (const kf of desc.keyframes) {
      if (p >= kf.time) {
        for (const [key, val] of Object.entries(kf.properties)) {
          anim.currentState.set(key, val)
        }
      }
    }
  }
}
