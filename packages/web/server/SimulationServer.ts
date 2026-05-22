import { RuntimeEngine } from '../src/runtime'
import type { SimulationFrame } from '../src/protocols/Serialization'
import type { Action } from '../src/protocols/transport/WebSocketTransport'

export class SimulationServer {
  private runtimes: Map<string, RuntimeEngine>
  private clients: Map<string, Set<string>>

  constructor() {
    this.runtimes = new Map()
    this.clients = new Map()
  }

  handleConnect(clientId: string): void {
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, new Set())
    }
  }

  handleDisconnect(clientId: string): void {
    this.clients.delete(clientId)
  }

  handleLoad(clientId: string, simId: string): { id: string; name: string; description: string; domain: string } {
    if (!this.clients.has(clientId)) this.handleConnect(clientId)
    const engine = new RuntimeEngine()
    this.runtimes.set(simId, engine)
    this.clients.get(clientId)?.add(simId)
    return { id: simId, name: `Simulation ${simId}`, description: 'Auto-generated server simulation', domain: 'custom' }
  }

  handleAction(clientId: string, simId: string, action: Action, _params?: Record<string, unknown>): SimulationFrame | null {
    const engine = this.runtimes.get(simId)
    if (!engine) return null

    switch (action) {
      case 'PLAY':
        engine.play()
        return this.buildFrame(engine, simId)
      case 'PAUSE':
        engine.pause()
        return this.buildFrame(engine, simId)
      case 'RESET':
        engine.reset()
        return this.buildFrame(engine, simId)
      case 'STEP':
        return this.buildFrame(engine, simId)
      case 'SEEK':
        engine.stop()
        return this.buildFrame(engine, simId)
      default:
        return this.buildFrame(engine, simId)
    }
  }

  private buildFrame(engine: RuntimeEngine, _simId: string): SimulationFrame {
    const frame = engine.getCurrentFrame()
    return {
      frameId: frame?.id ?? 0,
      timestamp: frame?.timestamp ?? Date.now(),
      events: frame?.events ?? [],
      state: { entities: engine.getCurrentGraph().getAllEntities().map(e => ({ id: e.id, kind: e.kind, type: e.type, properties: {} })), version: 0, checksum: BigInt(0) },
      narration: { text: '', concepts: [] },
      progress: 0,
    }
  }

  getRuntime(simId: string): RuntimeEngine | undefined {
    return this.runtimes.get(simId)
  }

  getActiveSimulations(): string[] {
    return Array.from(this.runtimes.keys())
  }
}
