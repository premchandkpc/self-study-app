import type { Plugin, PluginType, PluginConfig, Permission } from './Plugin'
import type { RuntimeEngine } from '../runtime'

export class SandboxedPlugin implements Plugin {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly type: PluginType
  private _initialized: boolean = false

  constructor(id: string, name: string, version: string, type: PluginType) {
    this.id = id
    this.name = name
    this.version = version
    this.type = type
  }

  init(_runtime: RuntimeEngine): void {
    this._initialized = true
  }

  activate(): void {
  }

  deactivate(): void {
  }

  dispose(): void {
  }

  getDependencies(): string[] {
    return []
  }

  getPermissions(): Permission[] {
    return [{ name: 'sandboxed-execution', description: 'Run in isolated Web Worker context' }]
  }

  getConfig(): PluginConfig {
    return { sandboxed: true }
  }

  isInitialized(): boolean {
    return this._initialized
  }
}
