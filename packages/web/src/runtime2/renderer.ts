import { Universe, Connection } from './core/Universe'
import { R2Object } from './core/R2Object'

export interface Viewport {
  x: number; y: number; scale: number; width: number; height: number
}

export class UniverseRenderer {
  ctx: CanvasRenderingContext2D | null = null
  viewport: Viewport = { x: 0, y: 0, scale: 1, width: 800, height: 600 }
  selectedId: string | null = null
  hoveredId: string | null = null
  animTime = 0
  showLabels = true
  showConnections = true
  showGrid = true
  darkMode = true

  private dragStart: { x: number; y: number; vx: number; vy: number } | null = null
  private _animFrame = 0
  private _dpr = 1

  attach(canvas: HTMLCanvasElement): void {
    this._dpr = window.devicePixelRatio || 1
    this.ctx = canvas.getContext('2d')
    this.viewport.width = canvas.width / this._dpr
    this.viewport.height = canvas.height / this._dpr

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const mx = e.offsetX / this._dpr, my = e.offsetY / this._dpr
      this.viewport.scale *= delta
      this.viewport.scale = Math.max(0.1, Math.min(10, this.viewport.scale))
      this.viewport.x = mx - (mx - this.viewport.x) * delta
      this.viewport.y = my - (my - this.viewport.y) * delta
    })

    canvas.addEventListener('mousedown', () => {
      this.selectedId = this.hoveredId
      this.dragStart = { x: 0, y: 0, vx: this.viewport.x, vy: this.viewport.y }
    })

    canvas.addEventListener('mousemove', (e) => {
      if (this.dragStart) {
        this.viewport.x = this.dragStart.vx + e.movementX / this._dpr
        this.viewport.y = this.dragStart.vy + e.movementY / this._dpr
      }
      this.hoveredId = this.hitTest(e.offsetX, e.offsetY)
      canvas.style.cursor = this.hoveredId ? 'pointer' : 'grab'
    })

    canvas.addEventListener('mouseup', () => { this.dragStart = null })
    canvas.addEventListener('mouseleave', () => { this.dragStart = null; this.hoveredId = null })
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx / this._dpr - this.viewport.x) / this.viewport.scale, y: (sy / this._dpr - this.viewport.y) / this.viewport.scale }
  }

  hitTest(sx: number, sy: number): string | null {
    const w = this.screenToWorld(sx, sy)
    // Linear scan — fine for <500 objects
    let closest: { id: string; dist: number } | null = null
    const check = (obj: R2Object) => {
      if (!obj.state.visible) return
      const { x, y, w: ow, h: oh } = obj.state
      if (w.x >= x && w.x <= x + ow && w.y >= y && w.y <= y + oh) {
        const cx = x + ow / 2, cy = y + oh / 2
        const d = Math.hypot(w.x - cx, w.y - cy)
        if (!closest || d < closest.dist) closest = { id: obj.id, dist: d }
      }
      obj.children.forEach(check)
    }
    // We don't have easy access to universe from here — objects must be
    // passed. UniverseRenderer owns no universe reference by design.
    // For now hitTest only checks via the passed universe in render().
    return null
  }

  setViewport(v: Partial<Viewport>): void {
    Object.assign(this.viewport, v)
  }

  private _hitTestCache: { universe: Universe; sx: number; sy: number; result: string | null } | null = null
  hitTestWithUniverse(sx: number, sy: number, universe: Universe): string | null {
    const w = this.screenToWorld(sx, sy)
    let closest: { id: string; dist: number } | null = null
    const check = (obj: R2Object) => {
      if (!obj.state.visible) return
      const { x, y, w: ow, h: oh } = obj.state
      if (w.x >= x && w.x <= x + ow && w.y >= y && w.y <= y + oh) {
        const cx = x + ow / 2, cy = y + oh / 2
        const d = Math.hypot(w.x - cx, w.y - cy)
        if (!closest || d < closest.dist) closest = { id: obj.id, dist: d }
      }
      obj.children.forEach(check)
    }
    universe.objects.forEach(check)
    return closest?.id ?? null
  }

  render(universe: Universe): void {
    const ctx = this.ctx
    if (!ctx) return
    const { x: ox, y: oy, scale, width, height } = this.viewport

    ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0)
    ctx.clearRect(0, 0, width * this._dpr, height * this._dpr)
    ctx.fillStyle = this.darkMode ? '#0f172a' : '#ffffff'
    ctx.fillRect(0, 0, width * this._dpr, height * this._dpr)

    ctx.save()
    ctx.translate(ox * this._dpr, oy * this._dpr)
    ctx.scale(scale * this._dpr, scale * this._dpr)

    if (this.showGrid) this.renderGrid(ctx)

    if (this.showConnections) {
      universe.connections.forEach(c => this.renderConnection(ctx, c, universe))
    }

    // Sort by zIndex for proper layering
    const sorted = Array.from(universe.objects.values()).sort((a, b) => a.state.zIndex - b.state.zIndex)
    sorted.forEach(obj => this.renderObject(ctx, obj, universe))

    ctx.restore()
  }

  private renderGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = this.darkMode ? '#1e293b' : '#e2e8f0'
    ctx.lineWidth = 0.5
    const gridSize = 40
    const { x: ox, y: oy, scale, width, height } = this.viewport
    const startX = Math.floor(-ox / scale / gridSize) * gridSize
    const startY = Math.floor(-oy / scale / gridSize) * gridSize
    const endX = startX + width / scale + gridSize
    const endY = startY + height / scale + gridSize

    ctx.beginPath()
    for (let x = startX; x <= endX; x += gridSize) { ctx.moveTo(x, startY); ctx.lineTo(x, endY) }
    for (let y = startY; y <= endY; y += gridSize) { ctx.moveTo(startX, y); ctx.lineTo(endX, y) }
    ctx.stroke()
  }

  private renderObject(ctx: CanvasRenderingContext2D, obj: R2Object, universe: Universe): void {
    if (!obj.state.visible) return
    const { x, y, w, h, color, opacity, labels } = obj.state
    ctx.globalAlpha = opacity
    const isSelected = this.selectedId === obj.id
    const isHovered = this.hoveredId === obj.id

    ctx.save()
    ctx.translate(x, y)

    const isTextType = ['label', 'string', 'char', 'int', 'float', 'bool', 'null', 'undefined'].includes(obj.type)

    if (!isTextType) {
      // Draw shape background
      ctx.globalAlpha = opacity * (isTextType ? 1 : 0.15)
      this.drawShape(ctx, obj, color, false)
      ctx.globalAlpha = opacity
      this.drawShape(ctx, obj, color, true)

      // Selection/hover highlight
      if (isSelected || isHovered) {
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 2.5
        ctx.setLineDash([])
        this.drawShapeOutline(ctx, obj)
      }
    } else {
      // Text types — draw with colored background box
      const padX = 4, padY = 2
      ctx.fillStyle = color + '30' // semi-transparent bg
      ctx.beginPath()
      const rr = 3
      ctx.moveTo(rr, 0); ctx.lineTo(w - rr, 0)
      ctx.quadraticCurveTo(w, 0, w, rr)
      ctx.lineTo(w, h - rr)
      ctx.quadraticCurveTo(w, h, w - rr, h)
      ctx.lineTo(rr, h)
      ctx.quadraticCurveTo(0, h, 0, h - rr)
      ctx.lineTo(0, rr)
      ctx.quadraticCurveTo(0, 0, rr, 0)
      ctx.closePath()
      ctx.fill()

      // Text
      ctx.fillStyle = color
      ctx.font = '11px monospace'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      const text = labels[0] || ''
      ctx.fillText(text, w / 2, h / 2)

      if (isSelected || isHovered) {
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 1.5
        ctx.strokeRect(0, 0, w, h)
      }
    }

    // Top label for non-text, non-variable types
    if (this.showLabels && labels.length > 0 && !isTextType && obj.type !== 'variable' && obj.type !== 'index-label' && obj.type !== 'col-header' && obj.type !== 'row-header' && obj.type !== 'stack-pointer' && obj.type !== 'queue-front' && obj.type !== 'queue-back') {
      ctx.fillStyle = this.darkMode ? '#e2e8f0' : '#1e293b'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(labels[0], w / 2, -4)
    }

    ctx.restore()
    ctx.globalAlpha = 1

    // Render children
    obj.children.forEach(child => {
      const cx = x + child.state.x
      const cy = y + child.state.y
      const origX = child.state.x, origY = child.state.y
      child.state.x = cx; child.state.y = cy
      this.renderObject(ctx, child, universe)
      child.state.x = origX; child.state.y = origY
    })
  }

  private drawShape(ctx: CanvasRenderingContext2D, obj: R2Object, color: string, stroke: boolean): void {
    const { w, h } = obj.state
    switch (obj.type) {
      case 'circle': {
        const r = w / 2
        ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.closePath()
        if (stroke) { ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke() }
        else { ctx.fillStyle = color; ctx.fill() }
        break
      }
      case 'diamond': {
        ctx.beginPath()
        ctx.moveTo(w / 2, 0); ctx.lineTo(w, h / 2); ctx.lineTo(w / 2, h); ctx.lineTo(0, h / 2)
        ctx.closePath()
        if (stroke) { ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke() }
        else { ctx.fillStyle = color; ctx.fill() }
        break
      }
      case 'boundary': {
        ctx.strokeStyle = obj.get('borderColor') as string || color
        ctx.lineWidth = obj.get('borderWidth') as number || 1
        ctx.setLineDash(obj.get('dashed') ? [5, 5] : [])
        ctx.strokeRect(0, 0, w, h)
        ctx.setLineDash([])
        break
      }
      default: {
        const r = 4
        ctx.beginPath()
        ctx.moveTo(r, 0); ctx.lineTo(w - r, 0)
        ctx.quadraticCurveTo(w, 0, w, r)
        ctx.lineTo(w, h - r)
        ctx.quadraticCurveTo(w, h, w - r, h)
        ctx.lineTo(r, h)
        ctx.quadraticCurveTo(0, h, 0, h - r)
        ctx.lineTo(0, r)
        ctx.quadraticCurveTo(0, 0, r, 0)
        ctx.closePath()
        if (stroke) { ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke() }
        else { ctx.fillStyle = color; ctx.fill() }
      }
    }
  }

  private drawShapeOutline(ctx: CanvasRenderingContext2D, obj: R2Object): void {
    const { w, h } = obj.state
    if (obj.type === 'circle') {
      ctx.beginPath(); ctx.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2); ctx.closePath(); ctx.stroke()
    } else if (obj.type === 'diamond') {
      ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w, h / 2); ctx.lineTo(w / 2, h); ctx.lineTo(0, h / 2); ctx.closePath(); ctx.stroke()
    } else {
      const r = 4
      ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(w - r, 0)
      ctx.quadraticCurveTo(w, 0, w, r)
      ctx.lineTo(w, h - r)
      ctx.quadraticCurveTo(w, h, w - r, h)
      ctx.lineTo(r, h)
      ctx.quadraticCurveTo(0, h, 0, h - r)
      ctx.lineTo(0, r)
      ctx.quadraticCurveTo(0, 0, r, 0)
      ctx.closePath(); ctx.stroke()
    }
  }

  private renderConnection(ctx: CanvasRenderingContext2D, c: Connection, universe: Universe): void {
    const from = universe.objects.get(c.fromId)
    const to = universe.objects.get(c.toId)
    if (!from || !to) return

    const fx = from.state.x + from.state.w / 2
    const fy = from.state.y + from.state.h / 2
    const tx = to.state.x + to.state.w / 2
    const ty = to.state.y + to.state.h / 2

    ctx.save()
    ctx.strokeStyle = c.color
    ctx.lineWidth = c.width
    ctx.globalAlpha = 0.6

    const dashPatterns: Record<string, number[]> = { solid: [], dashed: [6, 4], dotted: [2, 4] }
    ctx.setLineDash(dashPatterns[c.style] || [])

    let endX = tx, endY = ty

    if (c.curvature > 0) {
      const cpx = (fx + tx) / 2
      const cpy = (fy + ty) / 2 - c.curvature * 40
      ctx.beginPath(); ctx.moveTo(fx, fy)
      ctx.quadraticCurveTo(cpx, cpy, tx, ty)
      ctx.stroke()
      // Arrowhead along curve tangent
      const t = 0.95
      const mt = 1 - t
      endX = mt * mt * fx + 2 * mt * t * cpx + t * t * tx
      endY = mt * mt * fy + 2 * mt * t * cpy + t * t * ty
      const dt = 0.01
      const mt2 = 1 - (t + dt)
      const nx = mt2 * mt2 * fx + 2 * mt2 * (t + dt) * cpx + (t + dt) * (t + dt) * tx
      const ny = mt2 * mt2 * fy + 2 * mt2 * (t + dt) * cpy + (t + dt) * (t + dt) * ty
      this.drawArrowhead(ctx, endX, endY, Math.atan2(ny - endY, nx - endX), c.color)
    } else {
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke()
      const angle = Math.atan2(ty - fy, tx - fx)
      this.drawArrowhead(ctx, tx, ty, angle, c.color)
    }

    ctx.setLineDash([])

    if (c.label) {
      const mx = (fx + tx) / 2, my = (fy + ty) / 2
      ctx.fillStyle = this.darkMode ? '#94a3b8' : '#64748b'
      ctx.font = '9px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(c.label, mx, my - 6)
    }
    ctx.restore()
  }

  private drawArrowhead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string): void {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(-8, -4)
    ctx.lineTo(-8, 4)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.globalAlpha = 0.6
    ctx.fill()
    ctx.restore()
  }

  startAutoRender(universe: () => Universe): void {
    const loop = () => {
      this.animTime = performance.now()
      this.render(universe())
      this._animFrame = requestAnimationFrame(loop)
    }
    this._animFrame = requestAnimationFrame(loop)
  }

  stopAutoRender(): void {
    cancelAnimationFrame(this._animFrame)
  }
}
