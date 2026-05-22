import type { Plugin, PluginType } from './Plugin'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export class PluginRegistry {
  private plugins: Map<string, Plugin>
  private activated: Set<string>
  private dependencies: Map<string, string[]>
  private onActivatedCbs: ((plugin: Plugin) => void)[]
  private onDeactivatedCbs: ((plugin: Plugin) => void)[]

  constructor() {
    this.plugins = new Map()
    this.activated = new Set()
    this.dependencies = new Map()
    this.onActivatedCbs = []
    this.onDeactivatedCbs = []
  }

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin "${plugin.id}" is already registered`)
    }
    this.plugins.set(plugin.id, plugin)
    this.dependencies.set(plugin.id, plugin.getDependencies())
  }

  unregister(id: string): void {
    if (this.isActivated(id)) this.deactivate(id)
    this.plugins.delete(id)
    this.dependencies.delete(id)
  }

  activate(id: string): void {
    const plugin = this.plugins.get(id)
    if (!plugin) throw new Error(`Plugin "${id}" not found`)
    if (this.activated.has(id)) return

    const deps = this.resolveDependencies(id)
    for (const depId of deps) {
      if (!this.activated.has(depId)) {
        const dep = this.plugins.get(depId)
        if (dep) {
          this.activate(depId)
        }
      }
    }

    plugin.activate()
    this.activated.add(id)
    this.onActivatedCbs.forEach(cb => cb(plugin))
  }

  deactivate(id: string): void {
    const plugin = this.plugins.get(id)
    if (!plugin || !this.activated.has(id)) return
    plugin.deactivate()
    this.activated.delete(id)
    this.onDeactivatedCbs.forEach(cb => cb(plugin))
  }

  activateAll(): void {
    const order = this.topologicalSort()
    for (const id of order) {
      if (!this.activated.has(id)) {
        this.activate(id)
      }
    }
  }

  deactivateAll(): void {
    for (const id of Array.from(this.activated).reverse()) {
      this.deactivate(id)
    }
  }

  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id)
  }

  getPluginsByType(type: PluginType): Plugin[] {
    return Array.from(this.plugins.values()).filter(p => p.type === type)
  }

  isActivated(id: string): boolean {
    return this.activated.has(id)
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  resolveDependencies(id: string): string[] {
    const visited = new Set<string>()
    const result: string[] = []
    const visit = (pluginId: string) => {
      if (visited.has(pluginId)) return
      visited.add(pluginId)
      const deps = this.dependencies.get(pluginId) ?? []
      for (const dep of deps) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Missing dependency "${dep}" for plugin "${pluginId}"`)
        }
        visit(dep)
        result.push(dep)
      }
    }
    visit(id)
    return result.filter((v, i, a) => a.indexOf(v) === i)
  }

  validateDependencies(id: string): ValidationResult {
    const errors: string[] = []
    const plugin = this.plugins.get(id)
    if (!plugin) {
      errors.push(`Plugin "${id}" not found`)
      return { valid: false, errors }
    }
    for (const dep of plugin.getDependencies()) {
      if (!this.plugins.has(dep)) {
        errors.push(`Missing dependency: "${dep}" required by "${id}"`)
      }
    }
    return { valid: errors.length === 0, errors }
  }

  onActivated(cb: (plugin: Plugin) => void): void {
    this.onActivatedCbs.push(cb)
  }

  onDeactivated(cb: (plugin: Plugin) => void): void {
    this.onDeactivatedCbs.push(cb)
  }

  private topologicalSort(): string[] {
    const visited = new Set<string>()
    const result: string[] = []
    const visit = (id: string) => {
      if (visited.has(id)) return
      visited.add(id)
      const deps = this.dependencies.get(id) ?? []
      for (const dep of deps) {
        visit(dep)
      }
      result.push(id)
    }
    for (const id of this.plugins.keys()) {
      visit(id)
    }
    return result
  }
}
