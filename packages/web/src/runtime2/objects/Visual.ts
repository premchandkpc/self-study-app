import { R2Object } from '../core/R2Object'

export function Box(w: number, h: number, color: string, label?: string): R2Object {
  const b = new R2Object('box', 'visual', { color, w, h }).label(label || '')
  return b
}

export function Circle(r: number, color: string, label?: string): R2Object {
  const c = new R2Object('circle', 'visual', { color, w: r * 2, h: r * 2 }).label(label || '')
  c.set('radius', r)
  return c
}

export function Diamond(w: number, h: number, color: string, label?: string): R2Object {
  const d = new R2Object('diamond', 'visual', { color, w, h }).label(label || '')
  return d
}

export function Boundary(w: number, h: number, color: string, label?: string): R2Object {
  const b = new R2Object('boundary', 'visual', { color, w, h, opacity: 0.15 }).label(label || '')
  b.set('borderColor', color).set('borderWidth', 2).set('dashed', false)
  return b
}

export function Label(text: string, color?: string): R2Object {
  return new R2Object('label', 'visual', { color: color || '#e2e8f0', w: text.length * 8, h: 20 }).label(text).set('text', text)
}

export function Group(label: string): R2Object {
  return new R2Object('group', 'visual', { color: '#1e293b', w: 0, h: 0, opacity: 0 }).label(label)
}

export function HeatmapCell(val: number, maxVal: number): R2Object {
  const intensity = Math.min(1, val / maxVal)
  const r = Math.round(255 * intensity)
  const b = Math.round(255 * (1 - intensity))
  return new R2Object('heatmap-cell', 'visual', {
    color: `rgb(${r}, 50, ${b})`, w: 40, h: 40,
  }).set('value', val).label(String(val))
}
