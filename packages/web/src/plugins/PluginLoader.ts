import { PluginRegistry } from './PluginRegistry'
import type { Plugin, ValidationResult } from './Plugin'

export class PluginLoader {
  private registry: PluginRegistry

  constructor(registry: PluginRegistry) {
    this.registry = registry
  }

  async loadFromFile(_path: string): Promise<Plugin> {
    throw new Error('File loading not implemented in browser context')
  }

  async loadFromURL(_url: string): Promise<Plugin> {
    throw new Error('URL loading not implemented in browser context')
  }

  async loadFromDirectory(_dir: string): Promise<Plugin[]> {
    throw new Error('Directory loading not implemented in browser context')
  }

  async loadInSandbox(_path: string): Promise<Plugin> {
    throw new Error('Sandbox loading not implemented in browser context')
  }

  validate(plugin: Plugin): ValidationResult {
    const errors: string[] = []
    if (!plugin.id) errors.push('Plugin ID is required')
    if (!plugin.name) errors.push('Plugin name is required')
    if (!plugin.version) errors.push('Plugin version is required')
    if (typeof plugin.init !== 'function') errors.push('Plugin must implement init()')
    if (typeof plugin.activate !== 'function') errors.push('Plugin must implement activate()')
    if (typeof plugin.deactivate !== 'function') errors.push('Plugin must implement deactivate()')
    if (typeof plugin.dispose !== 'function') errors.push('Plugin must implement dispose()')
    return { valid: errors.length === 0, errors }
  }

  registerAndValidate(plugin: Plugin): void {
    const validation = this.validate(plugin)
    if (!validation.valid) throw new Error(`Plugin "${plugin.id}" validation failed: ${validation.errors.join(', ')}`)
    this.registry.register(plugin)
    const depValidation = this.registry.validateDependencies(plugin.id)
    if (!depValidation.valid) {
      this.registry.unregister(plugin.id)
      throw new Error(`Dependency validation failed: ${depValidation.errors.join(', ')}`)
    }
  }
}
