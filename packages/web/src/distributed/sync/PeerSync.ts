import { LWWRegister } from '../crdt/LWWRegister'
import type { RuntimeEvent } from '../../runtime'

export interface PeerConnection {
  id: string
  send(data: Uint8Array): void
  close(): void
}

export class PeerSync {
  private peers: Map<string, PeerConnection>
  private crdt: LWWRegister
  private peerId: string

  constructor(peerId: string, crdt: LWWRegister) {
    this.peers = new Map()
    this.crdt = crdt
    this.peerId = peerId
  }

  async connect(peerUrl: string, peerId: string): Promise<void> {
    const ws = new WebSocket(peerUrl)
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve()
      ws.onerror = () => reject(new Error('Connection failed'))
    })
    this.peers.set(peerId, { id: peerId, send: (data) => ws.send(data), close: () => ws.close() })
    ws.onmessage = (event) => {
      const remoteCRDT = new LWWRegister('remote')
      remoteCRDT.fromState(new Uint8Array(event.data as any))
      this.crdt.merge(remoteCRDT)
      this.onRemoteEvents?.(this.crdt.getEvents())
    }
  }

  disconnect(peerId: string): void {
    this.peers.get(peerId)?.close()
    this.peers.delete(peerId)
  }

  async sync(): Promise<void> {
    const state = this.crdt.toState()
    for (const peer of this.peers.values()) {
      peer.send(state)
    }
  }

  broadcastEvent(event: RuntimeEvent): void {
    this.crdt.addEvent(event)
    this.sync()
  }

  onRemoteEvents: ((events: { timestamp: number; value: unknown; peerId: string }[]) => void) | null = null

  getConnectedPeers(): string[] {
    return Array.from(this.peers.keys())
  }

  disconnectAll(): void {
    for (const peer of this.peers.values()) {
      peer.close()
    }
    this.peers.clear()
  }
}
