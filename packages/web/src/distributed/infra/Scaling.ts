export interface ServerNode {
  id: string
  url: string
  capacity: number
  load: number
  healthy: boolean
}

export interface ServerHealth {
  cpu: number
  memory: number
  activeSimulations: number
  lastHeartbeat: number
}

export class SimulationOrchestrator {
  private servers: Map<string, ServerNode>
  private routingTable: Map<string, string>

  constructor() {
    this.servers = new Map()
    this.routingTable = new Map()
  }

  addNode(url: string, capacity: number = 100): void {
    const id = `server-${this.servers.size + 1}`
    this.servers.set(id, { id, url, capacity, load: 0, healthy: true })
  }

  removeNode(id: string): void {
    this.servers.delete(id)
    for (const [simId, serverId] of this.routingTable) {
      if (serverId === id) this.routingTable.delete(simId)
    }
  }

  getServer(simId: string): string | undefined {
    return this.routingTable.get(simId)
  }

  assignSimulation(simId: string): string {
    const best = this.findLeastLoadedServer()
    if (best) {
      this.routingTable.set(simId, best.id)
      best.load++
    }
    return best?.id ?? ''
  }

  async migrate(simId: string, targetServerId: string): Promise<void> {
    const target = this.servers.get(targetServerId)
    if (!target || !target.healthy) throw new Error(`Target server ${targetServerId} unavailable`)
    const currentId = this.routingTable.get(simId)
    const current = currentId ? this.servers.get(currentId) : undefined
    if (current) current.load--
    this.routingTable.set(simId, targetServerId)
    target.load++
  }

  async healthCheck(): Promise<Map<string, ServerHealth>> {
    const results = new Map<string, ServerHealth>()
    for (const [id, server] of this.servers) {
      results.set(id, { cpu: 0.3 + Math.random() * 0.4, memory: 0.4 + Math.random() * 0.3, activeSimulations: server.load, lastHeartbeat: Date.now() })
    }
    return results
  }

  getNodes(): ServerNode[] {
    return Array.from(this.servers.values())
  }

  private findLeastLoadedServer(): ServerNode | undefined {
    return Array.from(this.servers.values())
      .filter(s => s.healthy && s.load < s.capacity)
      .sort((a, b) => a.load - b.load)[0]
  }
}
