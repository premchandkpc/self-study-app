import type { Renderer, Rect } from '../Renderer'
import type { SceneGraph, SceneNode } from '../scene/SceneGraph'
import type { AnimationEngine } from '../../animation/AnimationEngine'

export class CanvasRenderer implements Renderer {
  readonly type = 'canvas' as const
  private canvas!: HTMLCanvasElement
  private ctx!: CanvasRenderingContext2D
  private container: HTMLElement | null = null
  private viewportX: number = 0
  private viewportY: number = 0
  private zoom: number = 1
  private dirtyRegion: Rect | null = null
  private fps: number = 60
  private frameCount: number = 0
  private lastFpsTime: number = 0

  init(container: HTMLElement): void {
    this.container = container
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    this.canvas.style.display = 'block'
    container.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')!
    this.resize(container.clientWidth || 800, container.clientHeight || 600)
  }

  render(scene: SceneGraph, _animations?: AnimationEngine): void {
    this._measureFps()
    const ctx = this.ctx
    const cw = this.canvas.width, ch = this.canvas.height

    if (this.dirtyRegion) {
      ctx.clearRect(this.dirtyRegion.x, this.dirtyRegion.y, this.dirtyRegion.width, this.dirtyRegion.height)
    } else {
      ctx.clearRect(0, 0, cw, ch)
    }

    if (scene.background) {
      ctx.fillStyle = scene.background
      ctx.fillRect(0, 0, cw, ch)
    }

    ctx.save()
    ctx.translate(-this.viewportX, -this.viewportY)
    ctx.scale(this.zoom, this.zoom)

    this._renderEdges(ctx, scene)
    this._renderNodes(ctx, scene)

    ctx.restore()
    this.dirtyRegion = null
  }

  resize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  dispose(): void {
    this.canvas.remove()
  }

  setViewport(x: number, y: number, zoom: number): void {
    this.viewportX = x
    this.viewportY = y
    this.zoom = Math.max(0.1, zoom)
  }

  setDirtyRegion(region: Rect | null): void {
    this.dirtyRegion = region
  }

  getFPS(): number {
    return this.fps
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx
  }

  fitToScreen(scene: SceneGraph): void {
    const nodes = scene.getAllNodes()
    if (nodes.length === 0) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of nodes) {
      if (n.position.x < minX) minX = n.position.x
      if (n.position.y < minY) minY = n.position.y
      if (n.position.x + n.size.x > maxX) maxX = n.position.x + n.size.x
      if (n.position.y + n.size.y > maxY) maxY = n.position.y + n.size.y
    }
    const w = maxX - minX + 100, h = maxY - minY + 100
    const scaleX = this.canvas.width / w, scaleY = this.canvas.height / h
    this.zoom = Math.min(scaleX, scaleY) * 0.9
    this.viewportX = minX - 50
    this.viewportY = minY - 50
  }

  private _renderNodes(ctx: CanvasRenderingContext2D, scene: SceneGraph): void {
    const sorted = scene.sortedNodes()
    for (const node of sorted) {
      if (!node.visible) continue
      this._renderNode(ctx, node)
    }
  }

  private _renderNode(ctx: CanvasRenderingContext2D, node: SceneNode): void {
    ctx.save()
    ctx.globalAlpha = node.opacity
    ctx.translate(node.position.x, node.position.y)
    ctx.rotate(node.rotation)
    ctx.scale(node.scale, node.scale)

    const hw = node.size.x / 2, hh = node.size.y / 2

    if (node.borderWidth > 0 && node.borderColor) {
      ctx.strokeStyle = node.borderColor
      ctx.lineWidth = node.borderWidth
    }

    ctx.fillStyle = node.color
    ctx.beginPath()

    switch (node.shape) {
      case 'circle':
        ctx.arc(0, 0, hw, 0, Math.PI * 2)
        ctx.fill()
        if (node.borderWidth > 0) ctx.stroke()
        break
      case 'rect':
        this._roundRect(ctx, -hw, -hh, node.size.x, node.size.y, node.borderRadius)
        ctx.fill()
        if (node.borderWidth > 0) ctx.stroke()
        break
      case 'line':
        ctx.moveTo(-hw, 0)
        ctx.lineTo(hw, 0)
        ctx.strokeStyle = node.color
        ctx.lineWidth = node.borderWidth || 2
        ctx.stroke()
        break
      case 'path':
        ctx.fill()
        break
    }

    if (node.label) {
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '12px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.label, 0, 0)
    }

    ctx.restore()
  }

  private _renderEdges(ctx: CanvasRenderingContext2D, scene: SceneGraph): void {
    for (const edge of scene.getAllEdges()) {
      const from = scene.getNode(edge.from)
      const to = scene.getNode(edge.to)
      if (!from || !to) continue
      ctx.save()
      ctx.strokeStyle = edge.color ?? '#475569'
      ctx.lineWidth = edge.width ?? 1.5
      ctx.globalAlpha = from.opacity * to.opacity
      ctx.beginPath()
      ctx.moveTo(from.position.x, from.position.y)
      ctx.lineTo(to.position.x, to.position.y)
      ctx.stroke()
      if (edge.label) {
        const mx = (from.position.x + to.position.x) / 2
        const my = (from.position.y + to.position.y) / 2
        ctx.fillStyle = '#94a3b8'
        ctx.font = '10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(edge.label, mx, my - 6)
      }
      ctx.restore()
    }
  }

  private _roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    r = Math.min(r, w / 2, h / 2)
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  private _measureFps(): void {
    this.frameCount++
    const now = performance.now()
    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.lastFpsTime = now
    }
  }
}
