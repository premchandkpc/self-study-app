import { SimulationServer } from '../SimulationServer'

export function createRouter(server: SimulationServer) {
  return {
    async handleRequest(method: string, path: string, body?: unknown): Promise<{ status: number; body: unknown }> {
      const parts = path.split('/').filter(Boolean)

      if (method === 'GET' && path === '/api/simulations') {
        return { status: 200, body: server.getActiveSimulations() }
      }

      if (method === 'GET' && parts.length === 3 && parts[0] === 'api' && parts[1] === 'simulations') {
        const simId = parts[2]
        const engine = server.getRuntime(simId)
        if (!engine) return { status: 404, body: { error: 'Simulation not found' } }
        return { status: 200, body: { id: simId, status: 'loaded' } }
      }

      if (method === 'POST' && parts.length === 4 && parts[0] === 'api' && parts[1] === 'simulations' && parts[3] === 'play') {
        const simId = parts[2]
        const result = server.handleAction('anonymous', simId, 'PLAY', body as Record<string, unknown>)
        return { status: result ? 200 : 404, body: result ?? { error: 'Simulation not found' } }
      }

      if (method === 'POST' && parts.length === 4 && parts[0] === 'api' && parts[1] === 'simulations' && parts[3] === 'pause') {
        const simId = parts[2]
        const result = server.handleAction('anonymous', simId, 'PAUSE', body as Record<string, unknown>)
        return { status: result ? 200 : 404, body: result ?? { error: 'Simulation not found' } }
      }

      if (method === 'POST' && parts.length === 4 && parts[0] === 'api' && parts[1] === 'simulations' && parts[3] === 'reset') {
        const simId = parts[2]
        const result = server.handleAction('anonymous', simId, 'RESET', body as Record<string, unknown>)
        return { status: result ? 200 : 404, body: result ?? { error: 'Simulation not found' } }
      }

      if (method === 'POST' && parts.length === 3 && parts[0] === 'api' && parts[1] === 'simulations') {
        const simId = parts[2]
        const def = server.handleLoad('anonymous', simId)
        return { status: 200, body: def }
      }

      return { status: 404, body: { error: 'Not found' } }
    },
  }
}
