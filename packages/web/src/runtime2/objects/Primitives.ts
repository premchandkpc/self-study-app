import { R2Object } from '../core/R2Object'

export function Int(val: number, label?: string): R2Object {
  return new R2Object('int', 'primitive', { color: '#10b981' })
    .set('value', val).set('raw', val.toString()).label(label || String(val))
}
export function Float(val: number, label?: string): R2Object {
  return new R2Object('float', 'primitive', { color: '#34d399' })
    .set('value', val).set('raw', val.toFixed(2)).label(label || val.toFixed(2))
}
export function Str(val: string, label?: string): R2Object {
  return new R2Object('string', 'primitive', { color: '#f59e0b' })
    .set('value', val).set('raw', `"${val}"`).label(label || `"${val}"`).size(Math.max(40, val.length * 9), 36)
}
export function Bool(val: boolean, label?: string): R2Object {
  return new R2Object('bool', 'primitive', { color: '#8b5cf6' })
    .set('value', val).set('raw', String(val)).label(label || String(val))
}
export function NullObj(): R2Object {
  return new R2Object('null', 'primitive', { color: '#64748b' }).set('value', null).set('raw', 'null').label('null')
}
export function UndefinedObj(): R2Object {
  return new R2Object('undefined', 'primitive', { color: '#64748b' }).set('value', undefined).set('raw', 'undefined').label('undefined')
}

export function Char(val: string): R2Object {
  return new R2Object('char', 'primitive', { color: '#fbbf24', w: 32, h: 32 })
    .set('value', val).set('raw', `'${val}'`).label(`'${val}'`)
}
