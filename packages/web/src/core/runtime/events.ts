// Semantic event types for visualization runtime
// Every algorithm/scenario produces this event stream
// Runtime consumes events, not imperative commands

export type EventType =
  | 'ARRAY_COMPARE'
  | 'ARRAY_SWAP'
  | 'ARRAY_SET'
  | 'POINTER_MOVE'
  | 'POINTER_CREATE'
  | 'POINTER_DELETE'
  | 'NODE_CREATE'
  | 'NODE_UPDATE'
  | 'NODE_DELETE'
  | 'EDGE_CREATE'
  | 'EDGE_DELETE'
  | 'HIGHLIGHT_START'
  | 'HIGHLIGHT_END'
  | 'CUSTOM';

export interface SemanticEvent {
  // Core
  type: EventType;
  frameId: number;
  timestamp: number;
  duration?: number;

  // Semantic metadata
  concept?: string;
  explanation?: string;
  complexity?: string;
  importance?: 'low' | 'medium' | 'high';

  // Payload (event-specific data)
  [key: string]: any;
}

export interface ArrayCompareEvent extends SemanticEvent {
  type: 'ARRAY_COMPARE';
  indices: [number, number];
}

export interface ArraySwapEvent extends SemanticEvent {
  type: 'ARRAY_SWAP';
  indices: [number, number];
}

export interface ArraySetEvent extends SemanticEvent {
  type: 'ARRAY_SET';
  index: number;
  value: any;
}

export interface PointerMoveEvent extends SemanticEvent {
  type: 'POINTER_MOVE';
  fromIndex: number;
  toIndex: number;
}

export interface NodeUpdateEvent extends SemanticEvent {
  type: 'NODE_UPDATE';
  nodeId: string;
  updates: Record<string, any>;
}

export interface HighlightEvent extends SemanticEvent {
  type: 'HIGHLIGHT_START' | 'HIGHLIGHT_END';
  elementIds: string[];
  color?: string;
}
