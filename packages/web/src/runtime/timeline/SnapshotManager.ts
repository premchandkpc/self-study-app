import { Graph } from '../primitives/Graph'

export interface SnapshotEntry {
  frameIndex: number
  state: Graph
  isDelta: boolean
}

export class SnapshotManager {
  private snapshots: Map<number, SnapshotEntry> = new Map()
  private originalStates: Map<number, Graph> = new Map()

  snapshot(frameIndex: number, graph: Graph): void {
    const entry: SnapshotEntry = {
      frameIndex,
      state: graph.clone(),
      isDelta: false,
    }
    this.snapshots.set(frameIndex, entry)
    this.originalStates.set(frameIndex, graph.clone())
  }

  restore(frameIndex: number): { graph: Graph; fromFrame: number } {
    const exact = this.snapshots.get(frameIndex)
    if (exact && !exact.isDelta) {
      return { graph: exact.state.clone(), fromFrame: frameIndex }
    }
    const sortedFrames = Array.from(this.snapshots.keys()).sort((a, b) => a - b)
    let bestFrame = 0
    for (const f of sortedFrames) {
      if (f <= frameIndex) bestFrame = f
      else break
    }
    const entry = this.snapshots.get(bestFrame)
    if (entry) {
      return { graph: entry.state.clone(), fromFrame: bestFrame }
    }
    return { graph: new Graph(), fromFrame: 0 }
  }

  hasSnapshot(frameIndex: number): boolean {
    return this.snapshots.has(frameIndex)
  }

  prune(keepInterval: number): void {
    const frames = Array.from(this.snapshots.keys()).sort((a, b) => a - b)
    for (let i = 0; i < frames.length; i++) {
      if (frames[i] % keepInterval !== 0) {
        this.snapshots.delete(frames[i])
        this.originalStates.delete(frames[i])
      }
    }
  }

  compress(): void {
    const frames = Array.from(this.snapshots.keys()).sort((a, b) => a - b)
    for (let i = frames.length - 1; i > 0; i--) {
      const prev = this.originalStates.get(frames[i - 1])
      const curr = this.originalStates.get(frames[i])
      if (prev && curr) {
        const delta = this._computeDelta(prev, curr)
        this.snapshots.set(frames[i], {
          frameIndex: frames[i],
          state: delta,
          isDelta: true,
        })
      }
    }
  }

  decompress(frameIndex: number): Graph | null {
    const sortedFrames = Array.from(this.snapshots.keys()).sort((a, b) => a - b)
    let baseState: Graph | null = null
    let baseFrame = 0
    for (const f of sortedFrames) {
      if (f > frameIndex) break
      const entry = this.snapshots.get(f)
      if (!entry) continue
      if (entry.isDelta && baseState) {
        baseState = this._applyDelta(baseState, entry.state)
      } else if (!entry.isDelta) {
        baseState = entry.state.clone()
      }
      baseFrame = f
    }
    return baseState
  }

  getSnapshotCount(): number {
    return this.snapshots.size
  }

  clear(): void {
    this.snapshots.clear()
    this.originalStates.clear()
  }

  private _computeDelta(before: Graph, after: Graph): Graph {
    const delta = new Graph()
    const beforeEntities = before.getAllEntities()
    const afterEntities = after.getAllEntities()

    for (const ae of afterEntities) {
      const be = beforeEntities.find(e => e.id === ae.id)
      if (!be) {
        delta.addEntity(ae.clone())
        continue
      }
      for (const [key, val] of ae.properties) {
        const prevVal = be.properties.get(key)
        if (JSON.stringify(prevVal) !== JSON.stringify(val)) {
          const existing = delta.getEntity(ae.id)
          if (existing) {
            existing.set(key, val)
          } else {
            const e = ae.clone()
            e.properties = new Map()
            e.set(key, val)
            delta.addEntity(e)
          }
        }
      }
      for (const [key, val] of ae.labels) {
        if (be.labels.get(key) !== val) {
          const existing = delta.getEntity(ae.id) ?? ae.clone()
          existing.addLabel(key, val)
          if (!delta.hasEntity(ae.id)) delta.addEntity(existing)
        }
      }
    }
    return delta
  }

  private _applyDelta(base: Graph, delta: Graph): Graph {
    const result = base.clone()
    for (const entity of delta.getAllEntities()) {
      const existing = result.getEntity(entity.id)
      if (existing) {
        for (const [key, val] of entity.properties) {
          existing.set(key, val)
        }
      } else {
        result.addEntity(entity.clone())
      }
    }
    return result
  }
}
