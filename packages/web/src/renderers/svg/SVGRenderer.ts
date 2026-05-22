import type { Renderer, Rect } from '../Renderer'
import type { SceneGraph, SceneNode } from '../scene/SceneGraph'
import type { AnimationEngine } from '../../animation/AnimationEngine'

export class SVGRenderer implements Renderer {
  readonly type = 'svg' as const
  private svg!: SVGSVGElement
  private container: HTMLElement | null = null
  private ns = 'http://www.w3.org/2000/svg'
  private elements: Map<string, SVGElement> = new Map()
  private edgeElements: Map<string, SVGElement> = new Map()
  private viewportX: number = 0
  private viewportY: number = 0
  private zoom: number = 1
  private dirtyRegion: Rect | null = null
  private fps: number = 60
  private frameCount: number = 0
  private lastFpsTime: number = 0
  private bgRect!: SVGRectElement

  init(container: HTMLElement): void {
    this.container = container
    this.svg = document.createElementNS(this.ns, 'svg')
    this.svg.setAttribute('width', '100%')
    this.svg.setAttribute('height', '100%')
    this.svg.style.display = 'block'
    this.svg.style.background = '#0f172a'
    this.bgRect = document.createElementNS(this.ns, 'rect')
    this.bgRect.setAttribute('width', '100%')
    this.bgRect.setAttribute('height', '100%')
    this.bgRect.setAttribute('fill', '#0f172a')
    this.svg.appendChild(this.bgRect)
    container.appendChild(this.svg)
    this.resize(container.clientWidth || 800, container.clientHeight || 600)
  }

  render(scene: SceneGraph, _animations?: AnimationEngine): void {
    this._measureFps()
    const g = document.createElementNS(this.ns, 'g')
    g.setAttribute('transform', `translate(${-this.viewportX},${-this.viewportY}) scale(${this.zoom})`)

    const defs = document.createElementNS(this.ns, 'defs')
    const marker = document.createElementNS(this.ns, 'marker')
    marker.setAttribute('id', 'arrowhead')
    marker.setAttribute('markerWidth', '8')
    marker.setAttribute('markerHeight', '6')
    marker.setAttribute('refX', '8')
    marker.setAttribute('refY', '3')
    marker.setAttribute('orient', 'auto')
    const arrow = document.createElementNS(this.ns, 'polygon')
    arrow.setAttribute('points', '0 0, 8 3, 0 6')
    arrow.setAttribute('fill', '#475569')
    marker.appendChild(arrow)
    defs.appendChild(marker)
    g.appendChild(defs)

    this._renderEdges(g, scene)
    this._renderNodes(g, scene)

    this.svg.innerHTML = ''
    this.svg.appendChild(this.bgRect)
    this.svg.appendChild(g)
  }

  resize(width: number, height: number): void {
    this.svg.setAttribute('width', String(width))
    this.svg.setAttribute('height', String(height))
  }

  clear(): void {
    this.svg.innerHTML = ''
    this.svg.appendChild(this.bgRect)
    this.elements.clear()
    this.edgeElements.clear()
  }

  dispose(): void {
    this.svg.remove()
    this.elements.clear()
    this.edgeElements.clear()
  }

  setViewport(x: number, y: number, zoom: number): void {
    this.viewportX = x
    this.viewportY = y
    this.zoom = zoom
  }

  setDirtyRegion(_region: Rect | null): void {
    // SVG uses DOM diffing, full redraw is cheap
  }

  getFPS(): number {
    return this.fps
  }

  getSVG(): SVGSVGElement {
    return this.svg
  }

  private _renderNodes(parent: SVGElement, scene: SceneGraph): void {
    const sorted = scene.sortedNodes()
    for (const node of sorted) {
      if (!node.visible) continue
      const el = this._createNodeElement(node)
      parent.appendChild(el)
    }
  }

  private _createNodeElement(node: SceneNode): SVGElement {
    let el: SVGElement
    const cx = node.position.x, cy = node.position.y
    const w = node.size.x, h = node.size.y
    const tr = `translate(${cx},${cy}) rotate(${node.rotation * 180 / Math.PI}) scale(${node.scale})`

    switch (node.shape) {
      case 'circle': {
        el = document.createElementNS(this.ns, 'circle')
        el.setAttribute('cx', '0')
        el.setAttribute('cy', '0')
        el.setAttribute('r', String(w / 2))
        break
      }
      case 'line': {
        el = document.createElementNS(this.ns, 'line')
        el.setAttribute('x1', String(-w / 2))
        el.setAttribute('y1', '0')
        el.setAttribute('x2', String(w / 2))
        el.setAttribute('y2', '0')
        el.setAttribute('stroke-width', String(node.borderWidth || 2))
        break
      }
      default: {
        el = document.createElementNS(this.ns, 'rect')
        el.setAttribute('x', String(-w / 2))
        el.setAttribute('y', String(-h / 2))
        el.setAttribute('width', String(w))
        el.setAttribute('height', String(h))
        if (node.borderRadius > 0) {
          el.setAttribute('rx', String(node.borderRadius))
          el.setAttribute('ry', String(node.borderRadius))
        }
        break
      }
    }

    el.setAttribute('transform', tr)
    el.setAttribute('fill', node.color)
    el.setAttribute('opacity', String(node.opacity))
    if (node.borderColor) el.setAttribute('stroke', node.borderColor)
    if (node.borderWidth > 0) el.setAttribute('stroke-width', String(node.borderWidth))

    if (node.label) {
      const text = document.createElementNS(this.ns, 'text')
      text.setAttribute('x', '0')
      text.setAttribute('y', '4')
      text.setAttribute('text-anchor', 'middle')
      text.setAttribute('fill', '#e2e8f0')
      text.setAttribute('font-size', '12')
      text.setAttribute('font-family', 'monospace')
      text.textContent = node.label
      el.appendChild(text)
    }

    return el
  }

  private _renderEdges(parent: SVGElement, scene: SceneGraph): void {
    for (const edge of scene.getAllEdges()) {
      const from = scene.getNode(edge.from), to = scene.getNode(edge.to)
      if (!from || !to) continue
      const line = document.createElementNS(this.ns, 'line')
      line.setAttribute('x1', String(from.position.x))
      line.setAttribute('y1', String(from.position.y))
      line.setAttribute('x2', String(to.position.x))
      line.setAttribute('y2', String(to.position.y))
      line.setAttribute('stroke', edge.color ?? '#475569')
      line.setAttribute('stroke-width', String(edge.width ?? 1.5))
      line.setAttribute('opacity', String(Math.min(from.opacity, to.opacity)))
      line.setAttribute('marker-end', 'url(#arrowhead)')
      parent.appendChild(line)

      if (edge.label) {
        const mx = (from.position.x + to.position.x) / 2
        const my = (from.position.y + to.position.y) / 2
        const text = document.createElementNS(this.ns, 'text')
        text.setAttribute('x', String(mx))
        text.setAttribute('y', String(my - 6))
        text.setAttribute('text-anchor', 'middle')
        text.setAttribute('fill', '#94a3b8')
        text.setAttribute('font-size', '10')
        text.setAttribute('font-family', 'monospace')
        text.textContent = edge.label
        parent.appendChild(text)
      }
    }
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
