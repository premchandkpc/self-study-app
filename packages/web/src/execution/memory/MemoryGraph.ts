import { Graph, Entity } from '../../runtime/primitives'
import type { HeapObject } from '../Frame'

export interface HeapDiff {
  added: HeapObject[]
  removed: string[]
  modified: { id: string; before: Partial<HeapObject>; after: Partial<HeapObject> }[]
  totalMemoryBefore: number
  totalMemoryAfter: number
  delta: number
}

export class MemoryGraph {
  private objects: Map<string, HeapObject> = new Map()

  load(objects: HeapObject[]): void {
    for (const obj of objects) {
      this.objects.set(obj.id, obj)
    }
  }

  addObject(obj: HeapObject): void {
    this.objects.set(obj.id, obj)
  }

  removeObject(id: string): void {
    this.objects.delete(id)
  }

  getObject(id: string): HeapObject | undefined {
    return this.objects.get(id)
  }

  getAllObjects(): HeapObject[] {
    return Array.from(this.objects.values())
  }

  objectCount(): number {
    return this.objects.size
  }

  totalMemory(): number {
    let total = 0
    for (const obj of this.objects.values()) {
      total += obj.size
    }
    return total
  }

  buildGraph(): Graph {
    const g = new Graph()
    for (const obj of this.objects.values()) {
      const entity = new Entity(obj.id, 'heap-object', obj.type)
      entity.set('size', obj.size)
      entity.set('allocationSite', obj.allocationSite)
      entity.set('referenceCount', obj.references.length)
      entity.set('referencedByCount', obj.referencedBy.length)
      g.addEntity(entity)
    }
    for (const obj of this.objects.values()) {
      for (const ref of obj.references) {
        if (this.objects.has(ref)) {
          g.connect(obj.id, ref, 'references')
        }
      }
    }
    return g
  }

  diff(before: MemoryGraph, after: MemoryGraph): HeapDiff {
    const added: HeapObject[] = []
    const removed: string[] = []
    const modified: HeapDiff['modified'] = []

    for (const obj of after.getAllObjects()) {
      const existing = before.getObject(obj.id)
      if (!existing) {
        added.push(obj)
      } else {
        const changes: { before: Partial<HeapObject>; after: Partial<HeapObject> } = {
          before: {},
          after: {},
        }
        if (existing.size !== obj.size) {
          changes.before.size = existing.size
          changes.after.size = obj.size
        }
        if (JSON.stringify(existing.references) !== JSON.stringify(obj.references)) {
          changes.before.references = existing.references
          changes.after.references = obj.references
        }
        if (Object.keys(changes.before).length > 0) {
          modified.push({ id: obj.id, ...changes })
        }
      }
    }

    for (const obj of before.getAllObjects()) {
      if (!after.getObject(obj.id)) {
        removed.push(obj.id)
      }
    }

    const totalMemoryBefore = before.totalMemory()
    const totalMemoryAfter = after.totalMemory()

    return {
      added,
      removed,
      modified,
      totalMemoryBefore,
      totalMemoryAfter,
      delta: totalMemoryAfter - totalMemoryBefore,
    }
  }

  findLeaks(): HeapObject[] {
    return Array.from(this.objects.values()).filter(
      obj => obj.referencedBy.length === 0 && obj.id !== 'root',
    )
  }

  findRoots(): HeapObject[] {
    return Array.from(this.objects.values()).filter(
      obj => obj.references.length > 0 && obj.referencedBy.length === 0,
    )
  }

  getReferenceGraph(nodeId: string, maxDepth: number = 3): { node: HeapObject; depth: number }[] {
    const visited = new Set<string>()
    const result: { node: HeapObject; depth: number }[] = []
    const queue: { id: string; depth: number }[] = [{ id: nodeId, depth: 0 }]

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!
      if (visited.has(id) || depth > maxDepth) continue
      visited.add(id)

      const obj = this.objects.get(id)
      if (obj) {
        result.push({ node: obj, depth })
        for (const ref of obj.references) {
          queue.push({ id: ref, depth: depth + 1 })
        }
        for (const ref of obj.referencedBy) {
          queue.push({ id: ref, depth: depth + 1 })
        }
      }
    }

    return result
  }

  clone(): MemoryGraph {
    const mg = new MemoryGraph()
    for (const obj of this.objects.values()) {
      mg.addObject({ ...obj, fields: new Map(obj.fields), references: [...obj.references], referencedBy: [...obj.referencedBy] })
    }
    return mg
  }
}
