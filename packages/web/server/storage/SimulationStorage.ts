export interface SimulationSummary {
  id: string
  name: string
  domain: string
  createdAt: number
}

export interface SerializedRuntime {
  graphState: string
  currentFrame: number
  events: string
  timestamp: number
}

export interface SimulationStorage {
  save(sim: { id: string; name: string; domain: string }): Promise<void>
  load(id: string): Promise<{ id: string; name: string; domain: string } | null>
  list(filter?: { domain?: string }): Promise<SimulationSummary[]>
  saveState(id: string, state: SerializedRuntime): Promise<void>
  loadState(id: string): Promise<SerializedRuntime | null>
  delete(id: string): Promise<void>
}
