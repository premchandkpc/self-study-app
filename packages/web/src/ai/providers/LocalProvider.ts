import type { LLMProvider, LLMOptions, LLMResponse } from './LLMProvider'

export class LocalProvider implements LLMProvider {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl
  }

  async generate(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options?.model ?? 'llama3',
        prompt,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
      }),
    })
    const data = await response.json()
    return { text: data.response ?? '' }
  }

  async stream(prompt: string, onChunk: (chunk: string) => void, options?: LLMOptions): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options?.model ?? 'llama3',
        prompt,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        stream: true,
      }),
    })
    const reader = response.body?.getReader()
    if (!reader) return
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value)
      for (const line of text.split('\n').filter(Boolean)) {
        try {
          const parsed = JSON.parse(line)
          onChunk(parsed.response ?? '')
        } catch { }
      }
    }
  }
}
