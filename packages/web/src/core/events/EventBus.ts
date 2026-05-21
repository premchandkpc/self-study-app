// EventBus - Central event system for learning
// Enables: analytics, replay, multiplayer, AI guidance

import { EventEmitter } from './EventEmitter';

export type LearningEventType =
  | 'CONCEPT_STARTED'
  | 'SCENE_VIEWED'
  | 'NODE_SELECTED'
  | 'ANIMATION_COMPLETED'
  | 'QUIZ_ATTEMPTED'
  | 'CONCEPT_MASTERED'
  | 'ERROR_ENCOUNTERED'
  | 'HELP_REQUESTED'
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | string;

export interface LearningEvent {
  type: LearningEventType;
  userId?: string;
  conceptId: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
  success?: boolean;
}

export interface EventFilter {
  types?: LearningEventType[];
  conceptId?: string;
  userId?: string;
  startTime?: number;
  endTime?: number;
}

export class EventBus extends EventEmitter {
  private events: LearningEvent[] = [];
  private sessionStartTime: number = Date.now();
  private userId?: string;

  constructor(userId?: string) {
    super();
    this.userId = userId;
  }

  // Record event
  track(
    type: LearningEventType,
    conceptId: string,
    metadata?: Record<string, any>,
    duration?: number
  ): void {
    const event: LearningEvent = {
      type,
      userId: this.userId,
      conceptId,
      timestamp: Date.now(),
      duration,
      metadata,
    };

    this.events.push(event);
    this.emit(type, event);
    this.emit('*', event); // Broadcast all events
  }

  // Query events
  query(filter: EventFilter): LearningEvent[] {
    return this.events.filter((e) => {
      if (filter.types && !filter.types.includes(e.type)) return false;
      if (filter.conceptId && e.conceptId !== filter.conceptId) return false;
      if (filter.userId && e.userId !== filter.userId) return false;
      if (filter.startTime && e.timestamp < filter.startTime) return false;
      if (filter.endTime && e.timestamp > filter.endTime) return false;
      return true;
    });
  }

  // Replay: reconstruct session from events
  getSessionTimeline(): LearningEvent[] {
    return [...this.events].sort((a, b) => a.timestamp - b.timestamp);
  }

  // Analytics: concept mastery
  getConceptAttempts(conceptId: string): LearningEvent[] {
    return this.query({ conceptId });
  }

  getConceptStats(conceptId: string) {
    const attempts = this.getConceptAttempts(conceptId);
    const successful = attempts.filter((e) => e.success).length;
    const totalTime = attempts.reduce((sum, e) => sum + (e.duration ?? 0), 0);

    return {
      conceptId,
      attempts: attempts.length,
      successful,
      successRate: attempts.length > 0 ? successful / attempts.length : 0,
      totalMinutes: Math.round(totalTime / 60000),
      lastAttempt: attempts[attempts.length - 1]?.timestamp,
    };
  }

  // Progress tracking
  getMasteredConcepts(): string[] {
    const stats = new Map<string, number>();

    this.events.forEach((e) => {
      if (e.type === 'CONCEPT_MASTERED') {
        stats.set(e.conceptId, (stats.get(e.conceptId) ?? 0) + 1);
      }
    });

    return Array.from(stats.entries())
      .filter(([_, count]) => count > 0)
      .map(([id]) => id);
  }

  getSessionDuration(): number {
    return Date.now() - this.sessionStartTime;
  }

  // Export for backend/analytics
  export(): {
    userId?: string;
    events: LearningEvent[];
    sessionDuration: number;
    masteredConcepts: string[];
  } {
    return {
      userId: this.userId,
      events: [...this.events],
      sessionDuration: this.getSessionDuration(),
      masteredConcepts: this.getMasteredConcepts(),
    };
  }

  clear(): void {
    this.events = [];
    this.sessionStartTime = Date.now();
  }
}
