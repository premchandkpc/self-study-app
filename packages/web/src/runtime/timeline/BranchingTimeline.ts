import type { RuntimeEvent } from '../events/Event'
import { createEvent } from '../events/Event'
import { Timeline, type Frame } from './Timeline'
import { Graph } from '../primitives/Graph'
import { Entity } from '../primitives/Entity'

export interface TimelineBranch {
  id: string
  name: string
  baseFrameId: number
  events: RuntimeEvent[]
  parentId: string | null
  createdAt: number
}

export interface BranchingTimelineSchema {
  branches: {
    id: string
    name: string
    baseFrameId: number
    events: RuntimeEvent[]
    parentId: string | null
    createdAt: number
  }[]
  currentBranchId: string
  baseEvents: RuntimeEvent[]
}

export class BranchingTimeline {
  private branches: Map<string, TimelineBranch> = new Map()
  private currentBranchId: string
  private baseEvents: RuntimeEvent[]
  private timelines: Map<string, Timeline> = new Map()

  constructor(baseEvents: RuntimeEvent[] = []) {
    this.baseEvents = baseEvents
    const mainId = this._genId()
    this.branches.set(mainId, {
      id: mainId,
      name: 'main',
      baseFrameId: 0,
      events: [...baseEvents],
      parentId: null,
      createdAt: Date.now(),
    })
    this.currentBranchId = mainId
  }

  branch(name: string, fromFrameId: number): string {
    const current = this.getCurrentBranch()
    const branchPoint = current.events.findIndex(e => e.frameId >= fromFrameId)
    const branchEvents = branchPoint >= 0
      ? current.events.slice(branchPoint)
      : []
    const id = this._genId()
    this.branches.set(id, {
      id,
      name,
      baseFrameId: fromFrameId,
      events: branchEvents,
      parentId: this.currentBranchId,
      createdAt: Date.now(),
    })
    return id
  }

  switchBranch(branchId: string): void {
    if (!this.branches.has(branchId)) {
      throw new Error(`Branch "${branchId}" not found`)
    }
    this.currentBranchId = branchId
  }

  getCurrentBranch(): TimelineBranch {
    const branch = this.branches.get(this.currentBranchId)
    if (!branch) throw new Error('No current branch')
    return branch
  }

  getCurrentTimeline(): Timeline {
    const branch = this.getCurrentBranch()
    let tl = this.timelines.get(branch.id)
    if (!tl) {
      tl = new Timeline()
      for (const event of this.baseEvents) tl.addEvent(event)
      for (const event of branch.events) tl.addEvent(event)
      tl.buildFrames()
      this.timelines.set(branch.id, tl)
    }
    return tl
  }

  getBranches(): TimelineBranch[] {
    return Array.from(this.branches.values())
  }

  addEvent(event: RuntimeEvent): void {
    const branch = this.getCurrentBranch()
    branch.events.push(event)
    this.timelines.delete(branch.id)
  }

  mergeBranch(sourceId: string, targetId?: string): void {
    const source = this.branches.get(sourceId)
    if (!source) throw new Error(`Source branch "${sourceId}" not found`)
    const targetBranchId = targetId ?? this.currentBranchId
    const target = this.branches.get(targetBranchId)
    if (!target) throw new Error(`Target branch "${targetBranchId}" not found`)
    const mergedEvents = [...target.events]
    for (const event of source.events) {
      const existing = mergedEvents.findIndex(e => e.id === event.id)
      if (existing >= 0) {
        if (event.timestamp > mergedEvents[existing].timestamp) {
          mergedEvents[existing] = event
        }
      } else {
        mergedEvents.push(event)
      }
    }
    mergedEvents.sort((a, b) => a.timestamp - b.timestamp || a.frameId - b.frameId)
    target.events = mergedEvents
    this.timelines.delete(targetBranchId)
  }

  rebaseBranch(branchId: string, ontoFrameId: number): void {
    const branch = this.branches.get(branchId)
    if (!branch) throw new Error(`Branch "${branchId}" not found`)
    const current = this.getCurrentBranch()
    const baseEvents = current.events.filter(e => e.frameId <= ontoFrameId)
    const branchEvents = branch.events.filter(e => e.frameId > branch.baseFrameId)
    const rebasedEvents = branchEvents.map(e => ({
      ...e,
      frameId: ontoFrameId + e.frameId - branch.baseFrameId,
    }))
    branch.events = [...baseEvents, ...rebasedEvents]
    branch.baseFrameId = ontoFrameId
    this.timelines.delete(branchId)
  }

  diffBranches(a: string, b: string): RuntimeEvent[] {
    const branchA = this.branches.get(a)
    const branchB = this.branches.get(b)
    if (!branchA || !branchB) return []
    return branchB.events.filter(
      eB => !branchA.events.some(eA => eA.id === eB.id)
    )
  }

  deleteBranch(branchId: string): void {
    if (this.branches.size <= 1) return
    this.branches.delete(branchId)
    this.timelines.delete(branchId)
    if (this.currentBranchId === branchId) {
      this.currentBranchId = this.branches.keys().next().value!
    }
  }

  renameBranch(branchId: string, name: string): void {
    const branch = this.branches.get(branchId)
    if (branch) branch.name = name
  }

  export(): BranchingTimelineSchema {
    return {
      branches: Array.from(this.branches.values()).map(b => ({
        ...b,
        events: b.events.map(e => ({ ...e })),
      })),
      currentBranchId: this.currentBranchId,
      baseEvents: [...this.baseEvents],
    }
  }

  static import(schema: BranchingTimelineSchema): BranchingTimeline {
    const bt = new BranchingTimeline(schema.baseEvents)
    bt.branches.clear()
    for (const b of schema.branches) {
      bt.branches.set(b.id, { ...b, events: b.events.map(e => ({ ...e })) })
    }
    bt.currentBranchId = schema.currentBranchId
    return bt
  }

  private _genId(): string {
    return `br_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  }

  private _resolveConflicts(events: RuntimeEvent[]): RuntimeEvent[] {
    const seen = new Map<string, RuntimeEvent>()
    for (const e of events) {
      const existing = seen.get(e.id)
      if (!existing || e.timestamp > existing.timestamp) {
        seen.set(e.id, e)
      }
    }
    return Array.from(seen.values()).sort(
      (a, b) => a.timestamp - b.timestamp || a.frameId - b.frameId
    )
  }
}
