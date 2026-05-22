import type { SimulationStorage, SimulationSummary, SerializedRuntime } from './SimulationStorage'

export class InMemoryStorage implements SimulationStorage {
  private simulations: Map<string, { id: string; name: string; domain: string; createdAt: number }>
  private states: Map<string, SerializedRuntime>

  constructor() {
    this.simulations = new Map()
    this.states = new Map()
  }

  async save(sim: { id: string; name: string; domain: string }): Promise<void> {
    this.simulations.set(sim.id, { ...sim, createdAt: Date.now() })
  }

  async load(id: string): Promise<{ id: string; name: string; domain: string } | null> {
    return this.simulations.get(id) ?? null
  }

  async list(filter?: { domain?: string }): Promise<SimulationSummary[]> {
    let results = Array.from(this.simulations.values())
    if (filter?.domain) {
      results = results.filter(s => s.domain === filter.domain)
    }
    return results
  }

  async saveState(id: string, state: SerializedRuntime): Promise<void> {
    this.states.set(id, state)
  }

  async loadState(id: string): Promise<SerializedRuntime | null> {
    return this.states.get(id) ?? null
  }

  async delete(id: string): Promise<void> {
    this.simulations.delete(id)
    this.states.delete(id)
  }

  clear(): void {
    this.simulations.clear()
    this.states.clear()
  }
}
