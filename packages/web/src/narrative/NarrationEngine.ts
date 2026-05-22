import { NarrativeGraph, type NarrativeNode, type NarrativePath } from './NarrativeGraph'
import type { Timeline } from '../runtime/timeline/Timeline'
import type { SemanticGraph } from '../semantic/SemanticGraph'

export class NarrationEngine {
  private narrativeGraph: NarrativeGraph
  private currentPath: NarrativePath | null = null
  private changeCallbacks: Set<(node: NarrativeNode) => void> = new Set()

  constructor(narrativeGraph?: NarrativeGraph) {
    this.narrativeGraph = narrativeGraph ?? new NarrativeGraph()
  }

  generateNarration(timeline: Timeline, context: SemanticGraph): NarrativePath {
    const events = timeline.getFrames().flatMap(f => f.events)
    const path = this.narrativeGraph.buildNarrative(events, context)
    this.currentPath = path
    return path
  }

  getCurrentPath(): NarrativePath | null {
    return this.currentPath
  }

  nextNarration(): NarrativeNode | null {
    if (!this.currentPath) return null
    const next = this.currentPath.currentIndex + 1
    if (next >= this.currentPath.nodes.length) return null
    this.currentPath.currentIndex = next
    const node = this.currentPath.nodes[next]
    this._emitChange(node)
    return node
  }

  previousNarration(): NarrativeNode | null {
    if (!this.currentPath) return null
    const prev = this.currentPath.currentIndex - 1
    if (prev < 0) return null
    this.currentPath.currentIndex = prev
    const node = this.currentPath.nodes[prev]
    this._emitChange(node)
    return node
  }

  seekToFrame(frameIndex: number): NarrativeNode | null {
    if (!this.currentPath) return null
    const totalFrames = this.currentPath.nodes.length
    if (totalFrames === 0) return null
    const idx = Math.min(Math.floor((frameIndex / totalFrames) * totalFrames), totalFrames - 1)
    this.currentPath.currentIndex = idx
    const node = this.currentPath.nodes[idx]
    this._emitChange(node)
    return node
  }

  getCurrentText(): string {
    return this.currentPath?.nodes[this.currentPath.currentIndex]?.text ?? ''
  }

  getCurrentNode(): NarrativeNode | null {
    if (!this.currentPath) return null
    return this.currentPath.nodes[this.currentPath.currentIndex] ?? null
  }

  renderWithEmphasis(text: string, emphasis: string[]): string {
    return emphasis.reduce(
      (acc, word) => acc.replaceAll(word, `<mark>${word}</mark>`),
      text
    )
  }

  onNarrationChange(cb: (node: NarrativeNode) => void): () => void {
    this.changeCallbacks.add(cb)
    return () => this.changeCallbacks.delete(cb)
  }

  reset(): void {
    this.currentPath = null
  }

  private _emitChange(node: NarrativeNode): void {
    for (const cb of this.changeCallbacks) cb(node)
  }
}
