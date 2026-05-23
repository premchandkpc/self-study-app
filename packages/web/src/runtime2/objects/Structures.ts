import { R2Object } from '../core/R2Object'
import { Universe } from '../core/Universe'
import { Int } from './Primitives'

/* For objects that need to create universe-level connections, accept universe ref */
export type WithUniverse = { universe?: Universe }

/* ─── LinkedList with visual connections ─── */
export function LinkedListObj(values: number[], label?: string, ctx?: WithUniverse): R2Object {
  const ll = new R2Object('linkedlist', 'structure', { color: '#f97316', w: values.length * 70 + 20, h: 60 })
    .label(label || 'linked-list')
  const nodes: R2Object[] = []
  values.forEach((v, i) => {
    const node = new R2Object('ll-node', 'structure', { color: '#fb923c', w: 50, h: 36 })
      .pos(i * 70 + 10, 12).set('value', v).set('index', i).label(String(v))
    ll.addChild(node)
    nodes.push(node)
  })
  // Connect nodes visually in universe
  if (ctx?.universe) {
    for (let i = 0; i < nodes.length - 1; i++) {
      ctx.universe.connect(nodes[i], nodes[i + 1], 'next').color_('#f97316').curve(0.3)
    }
    if (nodes.length > 0) {
      ctx.universe.add(new R2Object('ll-head', 'visual', { color: '#f97316', w: 20, h: 12 })
        .pos(nodes[0].state.x - 20, nodes[0].state.y + 12).label('head'))
    }
  }
  ll.set('length', values.length)
  return ll
}

/* ─── Stack ─── */
export function StackObj(values: number[], label?: string): R2Object {
  const s = new R2Object('stack', 'structure', { color: '#a855f7', w: 80, h: Math.max(40, values.length * 44) })
    .label(label || 'stack')
  values.forEach((v, i) => {
    const el = Int(v).pos(15, (values.length - 1 - i) * 44).size(50, 38)
    el.set('depth', i)
    s.addChild(el)
  })
  s.set('size', values.length).set('top', values[values.length - 1] ?? null)
  if (values.length > 0) {
    s.addChild(new R2Object('stack-pointer', 'visual', { color: '#a855f7', w: 8, h: 8 })
      .pos(0, (values.length - 1) * 44 + 15).label('top'))
  }
  return s
}

/* ─── Queue ─── */
export function QueueObj(values: number[], label?: string): R2Object {
  const q = new R2Object('queue', 'structure', { color: '#06b6d4', w: Math.max(80, values.length * 54), h: 50 })
    .label(label || 'queue')
  values.forEach((v, i) => {
    const el = Int(v).pos(i * 52 + 15, 5).size(46, 38)
    el.set('position', i === 0 ? 'front' : i === values.length - 1 ? 'back' : 'middle')
    q.addChild(el)
  })
  q.set('size', values.length).set('front', values[0]).set('back', values[values.length - 1])
  if (values.length > 0) {
    q.addChild(new R2Object('queue-front', 'visual', { color: '#06b6d4', w: 8, h: 8 })
      .pos(15, -10).label('front'))
    q.addChild(new R2Object('queue-back', 'visual', { color: '#06b6d4', w: 8, h: 8 })
      .pos((values.length - 1) * 52 + 15, -10).label('back'))
  }
  return q
}

/* ─── Graph with universe connections ─── */
export function GraphObj(
  nodes: { id: string; label: string; val: number; x?: number; y?: number }[],
  edges: { from: string; to: string; weight?: number }[],
  label?: string,
  ctx?: WithUniverse
): R2Object {
  const g = new R2Object('graph', 'structure', { color: '#10b981', w: 320, h: 280 }).label(label || 'graph')
  const nodeMap = new Map<string, R2Object>()

  nodes.forEach(n => {
    const node = Int(n.val, n.label)
      .set('nodeId', n.id).size(44, 44)
    if (n.x !== undefined) node.state.x = n.x
    if (n.y !== undefined) node.state.y = n.y
    else { node.state.x = Math.random() * 220 + 20; node.state.y = Math.random() * 180 + 20 }
    g.addChild(node)
    nodeMap.set(n.id, node)
  })

  edges.forEach(e => {
    // Store edge metadata as child
    const edgeObj = new R2Object('graph-edge', 'structure', { color: '#34d399', w: 10, h: 4 })
      .set('from', e.from).set('to', e.to).set('weight', e.weight)
    g.addChild(edgeObj)
    // Create visual connection in universe
    if (ctx?.universe) {
      const fromNode = nodeMap.get(e.from)
      const toNode = nodeMap.get(e.to)
      if (fromNode && toNode) {
        ctx.universe.connect(fromNode, toNode, e.weight ? String(e.weight) : undefined)
          .color_('#34d399').curve(0.2)
      }
    }
  })

  g.set('nodeCount', nodes.length).set('edgeCount', edges.length)
  return g
}

/* ─── Tree with proper layout ─── */
export function TreeObj(values: (number | null)[], label?: string, ctx?: WithUniverse): R2Object {
  const totalWidth = 340
  const levelHeight = 60
  const depth = Math.ceil(Math.log2(values.length + 1))
  const t = new R2Object('tree', 'structure', { color: '#22c55e', w: totalWidth, h: depth * levelHeight + 20 })
    .label(label || 'tree')

  // Compute positions level by level
  const positions = new Map<number, { x: number; y: number }>()
  const nodeMap = new Map<number, R2Object>()
  const lastNodeInLevel = new Map<number, number>()

  values.forEach((v, i) => {
    if (v === null) return
    const level = Math.floor(Math.log2(i + 1))
    const nodesInLevel = Math.pow(2, level)
    const indexInLevel = i - (Math.pow(2, level) - 1)
    const cellWidth = totalWidth / (nodesInLevel + 1)
    const x = cellWidth * (indexInLevel + 1)
    const y = level * levelHeight + 15
    positions.set(i, { x, y })

    const node = Int(v).pos(x - 18, y - 18).size(36, 36)
    node.set('level', level).set('index', i)
    node.set('parent', i > 0 ? values[Math.floor((i - 1) / 2)] : null)
    node.set('left', i * 2 + 1 < values.length ? values[i * 2 + 1] : null)
    node.set('right', i * 2 + 2 < values.length ? values[i * 2 + 2] : null)
    t.addChild(node)
    nodeMap.set(i, node)
    lastNodeInLevel.set(level, i)
  })

  // Draw connections between parent and children
  if (ctx?.universe) {
    values.forEach((v, i) => {
      if (v === null) return
      const left = i * 2 + 1
      const right = i * 2 + 2
      const parent = nodeMap.get(i)
      if (!parent) return
      if (left < values.length && values[left] !== null) {
        const child = nodeMap.get(left)
        if (child) ctx.universe.connect(parent, child).color_('#22c55e').curve(0.15)
      }
      if (right < values.length && values[right] !== null) {
        const child = nodeMap.get(right)
        if (child) ctx.universe.connect(parent, child).color_('#22c55e').curve(0.15)
      }
    })
  }

  t.set('size', values.filter(v => v !== null).length).set('depth', depth)
  return t
}
