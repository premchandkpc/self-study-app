import type { RuntimeEngine } from '../runtime'

export type PluginType =
  | 'runtime'
  | 'renderer'
  | 'animation'
  | 'narrative'
  | 'ai'
  | 'layout'
  | 'instrumentation'
  | 'protocol'
  | 'domain'
  | 'concept'

export interface Permission {
  name: string
  description: string
}

export interface PluginConfig {
  [key: string]: unknown
}

export interface Plugin {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly type: PluginType

  init(runtime: RuntimeEngine): void
  activate(): void
  deactivate(): void
  dispose(): void

  getDependencies(): string[]
  getPermissions(): Permission[]
  getConfig(): PluginConfig
}
