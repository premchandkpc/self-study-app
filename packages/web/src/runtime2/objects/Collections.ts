import { R2Object } from '../core/R2Object'
import { Int, Str } from './Primitives'

export function ArrayObj(items: (R2Object | number | string)[], label?: string): R2Object {
  const arr = new R2Object('array', 'collection', { color: '#3b82f6', w: Math.max(100, items.length * 56 + 20), h: 80 })
    .label(label || 'array')
  items.forEach((item, i) => {
    const el = typeof item === 'number' ? Int(item)
      : typeof item === 'string' ? Str(item)
      : item
    el.set('index', i).size(44, 44).pos(10 + i * 52, 20)
    arr.addChild(el)
  })
  // Index labels below each element
  items.forEach((_, i) => {
    arr.addChild(new R2Object('index-label', 'visual', { color: '#64748b', w: 20, h: 12 })
      .pos(10 + i * 52 + 12, 64).label(String(i)))
  })
  arr.set('length', items.length)
  return arr
}

export function MapObj(entries: Record<string, string | number | boolean | null>, label?: string): R2Object {
  const keys = Object.keys(entries)
  const m = new R2Object('map', 'collection', { color: '#8b5cf6', w: Math.max(120, keys.length * 80 + 20), h: 100 })
    .label(label || 'map')
  keys.forEach((k, i) => {
    const v = new R2Object('map-entry', 'collection', { color: '#a78bfa', w: 70, h: 60 }).pos(10 + i * 76, 20)
    const keyObj = new R2Object('map-key', 'primitive', { color: '#f59e0b', w: 30, h: 20 })
      .set('value', k).label(k)
    const val = entries[k]
    const valObj = typeof val === 'number' ? Int(val)
      : typeof val === 'string' ? Str(val)
      : typeof val === 'boolean' ? new R2Object('bool', 'primitive', { color: '#8b5cf6', w: 30, h: 20 }).set('value', val).label(String(val))
      : new R2Object('null', 'primitive', { color: '#64748b', w: 30, h: 20 }).set('value', null).label('null')
    valObj.pos(0, 25).size(50, 24)
    v.addChild(keyObj)
    v.addChild(valObj)
    m.addChild(v)
  })
  m.set('size', keys.length)
  return m
}

export function MatrixObj(rows: number[][], label?: string): R2Object {
  if (!rows || rows.length === 0 || !rows[0]) {
    return new R2Object('matrix', 'collection', { color: '#06b6d4', w: 60, h: 40 }).label(label || 'empty-matrix')
  }
  const cols = rows[0].length
  const m = new R2Object('matrix', 'collection', {
    color: '#06b6d4',
    w: Math.max(80, cols * 48 + 10),
    h: Math.max(60, rows.length * 48 + 10),
  }).label(label || 'matrix')

  // Row and column headers
  const headerColor = '#0891b2'
  for (let ci = 0; ci < cols; ci++) {
    m.addChild(new R2Object('col-header', 'visual', { color: headerColor, w: 20, h: 12 })
      .pos(5 + ci * 48 + 10, 2).label(String(ci)))
  }
  for (let ri = 0; ri < rows.length; ri++) {
    m.addChild(new R2Object('row-header', 'visual', { color: headerColor, w: 16, h: 12 })
      .pos(2, 12 + ri * 48 + 12).label(String(ri)))
  }

  rows.forEach((row, ri) => {
    row.forEach((val, ci) => {
      const cell = Int(val).pos(10 + ci * 48, 12 + ri * 48).size(40, 40)
      cell.set('row', ri).set('col', ci)
      m.addChild(cell)
    })
  })
  m.set('rows', rows.length).set('cols', cols)
  return m
}
