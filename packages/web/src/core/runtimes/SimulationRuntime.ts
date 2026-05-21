// Simulation Runtime - Pure JS runtime for educational simulations
// NO React, NO DOM - just state machines and event emission
// Decoupled from visualization

import { EventEmitter } from '../events/EventEmitter';
import { IRLearningUnit, IRScene } from '../ir/schema';

export type SimulationState = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface SimulationConfig {
  learningUnit: IRLearningUnit;
  initialSceneIndex?: number;
}

export interface SimulationEvent {
  type: string;
  timestamp: number;
  sceneIndex: number;
  data?: any;
}

export class SimulationRuntime extends EventEmitter {
  private config: SimulationConfig;
  private state: SimulationState = 'idle';
  private sceneIndex: number = 0;
  private eventLog: SimulationEvent[] = [];
  private nodeStates: Map<string, any> = new Map();

  constructor(config: SimulationConfig) {
    super();
    this.config = config;
    this.sceneIndex = config.initialSceneIndex ?? 0;
  }

  // State accessors
  getState(): SimulationState {
    return this.state;
  }

  getSceneIndex(): number {
    return this.sceneIndex;
  }

  getCurrentScene(): IRScene | null {
    return this.config.learningUnit.scenes[this.sceneIndex] ?? null;
  }

  getScene(index: number): IRScene | null {
    return this.config.learningUnit.scenes[index] ?? null;
  }

  // Scene navigation
  advance(): void {
    if (this.state === 'error' || this.state === 'completed') return;

    const next = this.sceneIndex + 1;
    if (next < this.config.learningUnit.scenes.length) {
      this.sceneIndex = next;

      // Fine-grained emissions (only changed values)
      this.emitFieldChange('sceneIndex', this.sceneIndex);
      this.emitFieldChange('progress', this.progress);
      this.emitFieldChange('scene', this.scene);

      this.state = 'running';
      this.emitFieldChange('state', this.state);

      this.emitEvent('SCENE_ADVANCED', { sceneIndex: this.sceneIndex });

      // For backward compat, still emit full snapshot
      this.emit('stateChanged', this.getSnapshot());
    } else {
      this.state = 'completed';
      this.emitFieldChange('state', this.state);

      this.emitEvent('SIMULATION_COMPLETED', {});
      this.emit('stateChanged', this.getSnapshot());
    }
  }

  rewind(): void {
    if (this.sceneIndex > 0) {
      this.sceneIndex--;
      this.state = 'running';
      this.emitEvent('SCENE_REWOUND', { sceneIndex: this.sceneIndex });
      this.emit('stateChanged', this.getSnapshot());
    }
  }

  jumpToScene(index: number): void {
    if (index >= 0 && index < this.config.learningUnit.scenes.length) {
      this.sceneIndex = index;
      this.state = 'running';
      this.emitEvent('SCENE_JUMPED', { sceneIndex: this.sceneIndex });
      this.emit('stateChanged', this.getSnapshot());
    }
  }

  // Node interaction
  selectNode(nodeId: string): void {
    this.updateNodeState(nodeId, { selected: true });
    this.emitEvent('NODE_SELECTED', { nodeId });
    this.emit('stateChanged', this.getSnapshot());
  }

  deselectNode(nodeId: string): void {
    this.updateNodeState(nodeId, { selected: false });
    this.emitEvent('NODE_DESELECTED', { nodeId });
    this.emit('stateChanged', this.getSnapshot());
  }

  expandNode(nodeId: string, data?: any): void {
    this.updateNodeState(nodeId, { expanded: true, data });
    this.emitEvent('NODE_EXPANDED', { nodeId, data });
    this.emit('stateChanged', this.getSnapshot());
  }

  // Playback control
  play(): void {
    this.state = 'running';
    this.emitEvent('PLAYBACK_STARTED', {});
    this.emit('stateChanged', this.getSnapshot());
  }

  pause(): void {
    this.state = 'paused';
    this.emitEvent('PLAYBACK_PAUSED', {});
    this.emit('stateChanged', this.getSnapshot());
  }

  reset(): void {
    this.sceneIndex = 0;
    this.state = 'idle';
    this.nodeStates.clear();
    this.eventLog = [];
    this.emitEvent('SIMULATION_RESET', {});
    this.emit('stateChanged', this.getSnapshot());
  }

  // State mutation helpers
  private updateNodeState(nodeId: string, updates: any): void {
    const current = this.nodeStates.get(nodeId) ?? {};
    this.nodeStates.set(nodeId, { ...current, ...updates });
  }

  // Event logging for replay
  private emitEvent(type: string, data: any): void {
    const event: SimulationEvent = {
      type,
      timestamp: Date.now(),
      sceneIndex: this.sceneIndex,
      data,
    };
    this.eventLog.push(event);
  }

  getEventLog(): SimulationEvent[] {
    return [...this.eventLog];
  }

  // Snapshot for React (deprecated - use fine-grained subscriptions)
  getSnapshot(): {
    state: SimulationState;
    sceneIndex: number;
    scene: IRScene | null;
    progress: number;
    nodeStates: Record<string, any>;
  } {
    const snapshot = {
      state: this.state,
      sceneIndex: this.sceneIndex,
      scene: this.getCurrentScene(),
      progress:
        (this.sceneIndex / this.config.learningUnit.scenes.length) * 100,
      nodeStates: Object.fromEntries(this.nodeStates),
    };
    return snapshot;
  }

  // Fine-grained getters for useRuntimeValue hook
  get progress(): number {
    return (this.sceneIndex / this.config.learningUnit.scenes.length) * 100;
  }

  get scene(): IRScene | null {
    return this.getCurrentScene();
  }

  // Emit fine-grained updates (not full snapshot)
  private emitFieldChange(field: string, newValue: any): void {
    this.emit(`${field}:changed`, newValue);
  }

  // Replay from event log
  replay(events: SimulationEvent[]): void {
    this.reset();
    for (const event of events) {
      this.jumpToScene(event.sceneIndex);
      if (event.type === 'NODE_SELECTED' && event.data?.nodeId) {
        this.selectNode(event.data.nodeId);
      } else if (event.type === 'NODE_EXPANDED' && event.data?.nodeId) {
        this.expandNode(event.data.nodeId, event.data?.data);
      }
    }
  }
}
