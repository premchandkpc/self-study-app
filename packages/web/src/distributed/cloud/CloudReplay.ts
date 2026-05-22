import { RuntimeEngine } from '../../runtime'

export class CloudReplay {
  private runtime: RuntimeEngine
  private buffer: { id: number; timestamp: number; events: unknown[] }[]
  private recording: boolean

  constructor(runtime: RuntimeEngine) {
    this.runtime = runtime
    this.buffer = []
    this.recording = false
  }

  startRecording(): void {
    this.recording = true
    this.buffer = []
  }

  async stopRecording(): Promise<string> {
    this.recording = false
    const traceId = `trace-${Date.now()}`
    const blob = new Blob([JSON.stringify({ id: traceId, frames: this.buffer })], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    return url
  }

  async replay(traceUrl: string): Promise<void> {
    const response = await fetch(traceUrl)
    const trace = await response.json()
    if (trace.frames) {
      for (const frame of trace.frames) {
        this.buffer.push(frame)
      }
    }
  }

  async share(traceId: string, _startFrame?: number): Promise<string> {
    return `share://traces/${traceId}`
  }

  isRecording(): boolean {
    return this.recording
  }

  getBufferSize(): number {
    return this.buffer.length
  }
}
