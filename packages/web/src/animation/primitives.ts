export type AnimationPrimitive =
  | 'move' | 'flow' | 'pulse' | 'rotate' | 'morph'
  | 'split' | 'merge' | 'expand' | 'collapse'
  | 'interpolate' | 'glow' | 'shake' | 'highlight'
  | 'scale' | 'fade' | 'stream' | 'wave' | 'orbit'
  | 'spring' | 'gravity' | 'force-layout' | 'packet-flow'
  | 'path' | 'scribble' | 'magnetize' | 'ripple'

export type EasingFunction =
  | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  | 'spring' | 'bounce' | 'elastic'
  | `cubic-bezier(${number},${number},${number},${number})`

export interface Keyframe {
  time: number
  properties: Record<string, unknown>
}

export interface AnimatedProperty {
  property: string
  from: unknown
  to: unknown
  interpolator: 'linear' | 'ease' | 'spring' | 'cubic-bezier'
}

export interface AnimationDescriptor {
  id: string
  type: AnimationPrimitive
  targetIds: string[]
  duration: number
  delay?: number
  easing: EasingFunction
  keyframes: Keyframe[]
  iterations?: number
  direction?: 'normal' | 'reverse' | 'alternate'
  properties: AnimatedProperty[]
}

export function createAnimation(
  type: AnimationPrimitive,
  targetIds: string[],
  duration: number,
  overrides?: Partial<AnimationDescriptor>,
): AnimationDescriptor {
  return {
    id: `anim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    targetIds,
    duration,
    easing: 'linear',
    keyframes: [
      { time: 0, properties: {} },
      { time: 1, properties: {} },
    ],
    properties: [],
    ...overrides,
  }
}

export function interpolate(
  from: number,
  to: number,
  t: number,
  easing: EasingFunction,
): number {
  const e = applyEasing(t, easing)
  return from + (to - from) * e
}

export function applyEasing(t: number, easing: EasingFunction): number {
  switch (easing) {
    case 'linear':
      return t
    case 'ease-in':
      return t * t
    case 'ease-out':
      return t * (2 - t)
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    case 'spring':
      return 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 4.5)
    case 'bounce':
      if (t < 1 / 2.75) return 7.5625 * t * t
      if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75 }
      if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375 }
      t -= 2.625 / 2.75; return 7.5625 * t * t + 0.984375
    case 'elastic': {
      const p = 0.3, s = p / 4
      return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1
    }
    default:
      if (typeof easing === 'string' && easing.startsWith('cubic-bezier(')) {
        return cubicBezier(t, easing)
      }
      return t
  }
}

function cubicBezier(t: number, easing: string): number {
  const match = easing.match(/cubic-bezier\(([^,]+),([^,]+),([^,]+),([^)]+)\)/)
  if (!match) return t
  const [x1, y1, x2, y2] = match.slice(1).map(Number)
  let lo = 0, hi = 1, mid = t
  for (let i = 0; i < 10; i++) {
    mid = (lo + hi) / 2
    const x = sampleCurveX(mid, x1, x2)
    if (Math.abs(x - t) < 1e-4) break
    if (x < t) lo = mid
    else hi = mid
  }
  return sampleCurveY(mid, y1, y2)
}

function sampleCurveX(t: number, x1: number, x2: number): number {
  return ((1 - t) ** 3) * 0 + 3 * ((1 - t) ** 2) * t * x1 + 3 * (1 - t) * (t ** 2) * x2 + (t ** 3) * 1
}

function sampleCurveY(t: number, y1: number, y2: number): number {
  return ((1 - t) ** 3) * 0 + 3 * ((1 - t) ** 2) * t * y1 + 3 * (1 - t) * (t ** 2) * y2 + (t ** 3) * 1
}

export function interpolateColor(from: string, to: string, t: number): string {
  const f = parseHex(from), tgt = parseHex(to)
  if (!f || !tgt) return from
  const r = Math.round(f.r + (tgt.r - f.r) * t)
  const g = Math.round(f.g + (tgt.g - f.g) * t)
  const b = Math.round(f.b + (tgt.b - f.b) * t)
  return `rgb(${r},${g},${b})`
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null
}
