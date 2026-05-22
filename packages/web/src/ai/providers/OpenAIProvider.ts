import type { LLMProvider, LLMOptions, LLMResponse } from './LLMProvider'

export class OpenAIProvider implements LLMProvider {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string, baseUrl: string = 'https://api.openai.com/v1') {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? ''
    this.baseUrl = baseUrl
  }

  async generate(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: options?.model ?? 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
      }),
    })
    const data = await response.json()
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      usage: data.usage ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens } : undefined,
    }
  }

  async stream(prompt: string, onChunk: (chunk: string) => void, options?: LLMOptions): Promise<void> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: options?.model ?? 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
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
      const lines = text.split('\n').filter(l => l.startsWith('data: '))
      for (const line of lines) {
        const json = line.slice(6)
        if (json === '[DONE]') return
        try {
          const parsed = JSON.parse(json)
          onChunk(parsed.choices?.[0]?.delta?.content ?? '')
        } catch { }
      }
    }
  }
}
