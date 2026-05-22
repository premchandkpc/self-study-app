import type { SimulationFrame } from '../Serialization'

export type Action = 'LOAD' | 'PLAY' | 'PAUSE' | 'SEEK' | 'STEP' | 'RESET' | 'SET_SPEED' | 'BRANCH'

export interface TransportEventMap {
  frame: (frame: SimulationFrame) => void
  connected: () => void
  disconnected: () => void
  error: (err: Error) => void
}

export class WebSocketTransport {
  private ws: WebSocket | null = null
  private url: string
  private pending: Map<string, { resolve: (value: SimulationFrame) => void; reject: (reason: Error) => void }>
  private listeners: Partial<TransportEventMap>
  private reconnectAttempts: number = 0
  private maxReconnect: number = 5

  constructor(url: string) {
    this.url = url
    this.pending = new Map()
    this.listeners = {}
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)
        this.ws.onopen = () => {
          this.reconnectAttempts = 0
          this.listeners.connected?.()
          resolve()
        }
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'frame') {
              this.listeners.frame?.(data.payload)
            } else if (data.type === 'response' && data.id) {
              this.pending.get(data.id)?.resolve(data.payload)
              this.pending.delete(data.id)
            }
          } catch (err) {
            this.listeners.error?.(err as Error)
          }
        }
        this.ws.onclose = () => {
          this.listeners.disconnected?.()
          this.reconnect()
        }
        this.ws.onerror = () => {
          reject(new Error('WebSocket connection failed'))
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  disconnect(): void {
    this.ws?.close()
    this.ws = null
  }

  async send(action: Action, params?: Record<string, unknown>): Promise<SimulationFrame> {
    const id = crypto.randomUUID()
    const msg = JSON.stringify({ type: 'action', id, action, params })
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws?.send(msg)
      setTimeout(() => {
        this.pending.delete(id)
        reject(new Error('Request timeout'))
      }, 30000)
    })
  }

  sendBinary(data: Uint8Array): void {
    this.ws?.send(data)
  }

  on<K extends keyof TransportEventMap>(event: K, cb: TransportEventMap[K]): void {
    this.listeners[event] = cb as any
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnect) return
    this.reconnectAttempts++
    setTimeout(() => {
      this.connect().catch(() => {})
    }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000))
  }
}
