import type { SceneGraph } from './scene/SceneGraph'
import type { AnimationEngine } from '../animation/AnimationEngine'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Renderer {
  readonly type: 'canvas' | 'svg' | 'webgl' | 'dom'

  init(container: HTMLElement): void
  render(scene: SceneGraph, animations?: AnimationEngine): void
  resize(width: number, height: number): void
  clear(): void
  dispose(): void

  setViewport(x: number, y: number, zoom: number): void
  setDirtyRegion(region: Rect | null): void
  getFPS(): number
}
