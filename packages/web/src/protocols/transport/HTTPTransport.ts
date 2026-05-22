import type { SimulationFrame } from '../Serialization'
import type { Action } from './WebSocketTransport'

export class HTTPTransport {
  private baseUrl: string

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  async loadSimulation(id: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}/simulations/${id}`)
    if (!response.ok) throw new Error(`Failed to load simulation: ${response.statusText}`)
    return response.json()
  }

  async getFrame(id: string, frameIndex: number): Promise<SimulationFrame> {
    const response = await fetch(`${this.baseUrl}/simulations/${id}/frame?index=${frameIndex}`)
    if (!response.ok) throw new Error(`Failed to get frame: ${response.statusText}`)
    return response.json()
  }

  async executeAction(id: string, action: Action, params?: Record<string, unknown>): Promise<SimulationFrame> {
    const response = await fetch(`${this.baseUrl}/simulations/${id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params }),
    })
    if (!response.ok) throw new Error(`Action failed: ${response.statusText}`)
    return response.json()
  }

  async listSimulations(): Promise<{ id: string; name: string; domain: string }[]> {
    const response = await fetch(`${this.baseUrl}/simulations`)
    if (!response.ok) throw new Error(`Failed to list simulations: ${response.statusText}`)
    return response.json()
  }

  async createSimulation(sim: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}/simulations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sim),
    })
    if (!response.ok) throw new Error(`Failed to create simulation: ${response.statusText}`)
    return response.json()
  }
}
