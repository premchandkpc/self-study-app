import { RuntimeEngine } from '../runtime'
import { PeerSync } from './sync/PeerSync'
import { LWWRegister } from './crdt/LWWRegister'
import { EventOrdering } from './sync/EventOrdering'

export interface Position {
  x: number
  y: number
}

export interface Annotation {
  peerId: string
  text: string
  timestamp: number
}

export class MultiplayerRuntime {
  private runtime: RuntimeEngine
  private sync: PeerSync
  private ordering: EventOrdering
  private room: string
  private peerId: string
  private cursors: Map<string, Position>
  private annotations: Map<number, Annotation[]>

  constructor(runtime: RuntimeEngine, room: string) {
    this.runtime = runtime
    this.peerId = `peer-${Math.random().toString(36).slice(2, 8)}`
    this.room = room
    this.sync = new PeerSync(this.peerId, new LWWRegister(this.peerId))
    this.ordering = new EventOrdering(this.peerId)
    this.cursors = new Map()
    this.annotations = new Map()
  }

  async join(url: string): Promise<void> {
    await this.sync.connect(url, this.peerId)
    this.sync.onRemoteEvents = (events) => {
      for (const event of events) {
        this.ordering.receive(event as any)
      }
    }
  }

  async leave(): Promise<void> {
    this.sync.disconnectAll()
  }

  async play(): Promise<void> {
    this.runtime.play()
  }

  async pause(): Promise<void> {
    this.runtime.pause()
  }

  async seek(frameIndex: number): Promise<void> {
    this.runtime.stop()
  }

  setSpeed(speed: number): void {
    // Speed sync would go through WebSocket
  }

  setCursor(position: Position): void {
    this.cursors.set(this.peerId, position)
  }

  onCursorChange(cb: (peerId: string, pos: Position) => void): void {
    // Placeholder for cursor broadcast
  }

  annotate(frameIndex: number, text: string): void {
    if (!this.annotations.has(frameIndex)) {
      this.annotations.set(frameIndex, [])
    }
    this.annotations.get(frameIndex)!.push({
      peerId: this.peerId,
      text,
      timestamp: Date.now(),
    })
  }

  getAnnotations(): Map<number, Annotation[]> {
    return new Map(this.annotations)
  }

  getPeerId(): string {
    return this.peerId
  }

  getRoom(): string {
    return this.room
  }
}
