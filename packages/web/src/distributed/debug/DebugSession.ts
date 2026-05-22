import type { RuntimeEvent } from '../../runtime'

export interface Breakpoint {
  frameIndex: number
  peerId?: string
  condition?: string
}

export interface WatchExpression {
  expression: string
  value?: unknown
}

export interface DebugPeerState {
  frameIndex: number
  variables: Record<string, unknown>
  activeBreakpoints: number[]
}

export class DebugSession {
  private peers: Map<string, DebugPeerState>
  private breakpoints: Map<number, Breakpoint[]>
  private watchExpressions: Map<string, WatchExpression[]>

  constructor() {
    this.peers = new Map()
    this.breakpoints = new Map()
    this.watchExpressions = new Map()
  }

  setBreakpoint(frameIndex: number, peerId?: string): void {
    if (!this.breakpoints.has(frameIndex)) {
      this.breakpoints.set(frameIndex, [])
    }
    this.breakpoints.get(frameIndex)!.push({ frameIndex, peerId })
  }

  removeBreakpoint(frameIndex: number): void {
    this.breakpoints.delete(frameIndex)
  }

  addWatch(peerId: string, expression: string): void {
    if (!this.watchExpressions.has(peerId)) {
      this.watchExpressions.set(peerId, [])
    }
    this.watchExpressions.get(peerId)!.push({ expression })
  }

  stepOver(): void {
    // Advance all peers by 1 frame
  }

  stepInto(): void {
    // Step into next event/function
  }

  stepOut(): void {
    // Step out to return
  }

  getPeerState(peerId: string): DebugPeerState | undefined {
    return this.peers.get(peerId)
  }

  updatePeerState(peerId: string, state: DebugPeerState): void {
    this.peers.set(peerId, state)
  }

  getBreakpoints(): Map<number, Breakpoint[]> {
    return new Map(this.breakpoints)
  }

  evaluateWatch(_expression: string, _currentEvent?: RuntimeEvent): unknown {
    return undefined
  }
}
