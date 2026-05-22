import { RuntimeEngine } from '../runtime/engine/RuntimeEngine'
import { NarrationEngine } from './NarrationEngine'
import type { RuntimeEvent } from '../runtime/events/Event'

export class NarrativeSync {
  private engine: RuntimeEngine
  private narration: NarrationEngine
  private active: boolean = false
  private unsubFrame: (() => void) | null = null
  private displayCallbacks: Set<(text: string, emphasis: string[]) => void> = new Set()

  constructor(engine: RuntimeEngine, narration: NarrationEngine) {
    this.engine = engine
    this.narration = narration
  }

  start(): void {
    if (this.active) return
    this.active = true
    this.unsubFrame = this.engine.onFrameChange((frame) => {
      if (!this.active) return
      const node = this.narration.seekToFrame(frame.id)
      if (node) {
        const text = this.narration.renderWithEmphasis(node.text, node.emphasis)
        for (const cb of this.displayCallbacks) cb(text, node.emphasis)
      }
    })
  }

  stop(): void {
    this.active = false
    if (this.unsubFrame) {
      this.unsubFrame()
      this.unsubFrame = null
    }
  }

  isActive(): boolean {
    return this.active
  }

  onDisplay(cb: (text: string, emphasis: string[]) => void): () => void {
    this.displayCallbacks.add(cb)
    return () => this.displayCallbacks.delete(cb)
  }

  getOptimalPace(event: RuntimeEvent): number {
    if (event.importance && event.importance > 0.8) return 0.5
    if (event.concept === 'sorting' || event.concept === 'deadlock') return 0.75
    return 1.0
  }

  destroy(): void {
    this.stop()
    this.displayCallbacks.clear()
  }
}
