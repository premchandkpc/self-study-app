export interface LLMOptions {
  temperature?: number
  maxTokens?: number
  model?: string
}

export interface LLMResponse {
  text: string
  usage?: { promptTokens: number; completionTokens: number }
}

export interface LLMProvider {
  generate(prompt: string, options?: LLMOptions): Promise<LLMResponse>
  stream(prompt: string, onChunk: (chunk: string) => void, options?: LLMOptions): Promise<void>
}
