/**
 * VisualizerRegistry — Plugin system for dynamic visualizer registration.
 * Decouples visualizer implementations from core routing.
 * Enables third-party visualizers without code changes.
 */

import type { ScenarioDescriptor, SceneIR, VisualizationType } from '../ir/VisualizationSchema';

export interface VisualizerPlugin {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  category?: 'dsa' | 'system-design' | 'algorithm' | 'ai' | 'custom';

  // Scenario builder function
  scenarios?: ScenarioDescriptor[];

  // Optional: custom renderer (uses PrimitiveRenderer by default)
  renderScene?: (scene: SceneIR) => React.ReactNode;

  // Optional: custom visualization types this plugin supports
  supportedTypes?: VisualizationType[];

  // Metadata
  version?: string;
  author?: string;
  tags?: string[];
}

type VisualizerRegistry = {
  [key: string]: VisualizerPlugin;
};

/**
 * Global visualizer registry.
 * Populated at app startup with built-in visualizers.
 * Extended at runtime with plugins.
 */
class VisualizerRegistryImpl {
  private registry: VisualizerRegistry = {};
  private listeners: Set<() => void> = new Set();

  /**
   * Register a visualizer plugin.
   */
  register(plugin: VisualizerPlugin): void {
    this.registry[plugin.id] = plugin;
    this.notifyListeners();
  }

  /**
   * Register multiple visualizers.
   */
  registerBatch(plugins: VisualizerPlugin[]): void {
    plugins.forEach((p) => {
      this.registry[p.id] = p;
    });
    this.notifyListeners();
  }

  /**
   * Unregister a visualizer.
   */
  unregister(id: string): boolean {
    if (id in this.registry) {
      delete this.registry[id];
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Get visualizer by ID.
   */
  get(id: string): VisualizerPlugin | undefined {
    return this.registry[id];
  }

  /**
   * Get all visualizers.
   */
  getAll(): VisualizerPlugin[] {
    return Object.values(this.registry);
  }

  /**
   * Find visualizers by category.
   */
  findByCategory(category: string): VisualizerPlugin[] {
    return Object.values(this.registry).filter((p) => p.category === category);
  }

  /**
   * Find visualizers by tag.
   */
  findByTag(tag: string): VisualizerPlugin[] {
    return Object.values(this.registry).filter((p) => p.tags?.includes(tag));
  }

  /**
   * Get all scenarios from all visualizers.
   */
  getAllScenarios(): ScenarioDescriptor[] {
    const scenarios: ScenarioDescriptor[] = [];
    for (const plugin of Object.values(this.registry)) {
      if (plugin.scenarios) {
        scenarios.push(...plugin.scenarios);
      }
    }
    return scenarios;
  }

  /**
   * Get scenarios for a specific visualizer.
   */
  getScenarios(visualizerId: string): ScenarioDescriptor[] {
    const plugin = this.registry[visualizerId];
    return plugin?.scenarios ?? [];
  }

  /**
   * Subscribe to registry changes.
   */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Clear registry (for testing).
   */
  clear(): void {
    this.registry = {};
    this.notifyListeners();
  }

  /**
   * Get count of registered visualizers.
   */
  size(): number {
    return Object.keys(this.registry).length;
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

// Singleton instance
export const visualizerRegistry = new VisualizerRegistryImpl();

// Re-export type
export type { VisualizerPlugin };
