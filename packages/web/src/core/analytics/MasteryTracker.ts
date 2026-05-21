// MasteryTracker - Track concept mastery and learning progress
// Based on EventBus learning events

import { LearningEvent } from '../events/EventBus';

export type MasteryLevel = 'beginner' | 'intermediate' | 'proficient' | 'expert';

export interface ConceptMastery {
  conceptId: string;
  conceptName: string;
  level: MasteryLevel;
  score: number; // 0-100
  attempts: number;
  successes: number;
  timeSpent: number; // milliseconds
  lastAttempt: number;
  strengths: string[];
  weaknesses: string[];
}

export interface LearningMetrics {
  totalTimeSpent: number;
  conceptsAttempted: number;
  conceptsMastered: number;
  averageSuccessRate: number;
  recentProgress: number; // Change in last 7 days
  conceptMastery: Map<string, ConceptMastery>;
}

export class MasteryTracker {
  private conceptMastery: Map<string, ConceptMastery> = new Map();
  private eventHistory: LearningEvent[] = [];
  private sessionStartTime: number = Date.now();

  addEvent(event: LearningEvent) {
    this.eventHistory.push(event);
    this.updateMasteryFromEvent(event);
  }

  private updateMasteryFromEvent(event: LearningEvent) {
    const conceptId = event.metadata?.conceptId;
    if (!conceptId) return;

    const mastery = this.getMasteryOrCreate(conceptId);

    switch (event.type) {
      case 'concept_attempted':
        mastery.attempts += 1;
        mastery.lastAttempt = event.timestamp;
        break;

      case 'quiz_submitted':
        const score = event.metadata?.score || 0;
        const maxScore = event.metadata?.maxScore || 100;
        const normalizedScore = (score / maxScore) * 100;

        mastery.successes += normalizedScore > 50 ? 1 : 0;
        mastery.score = this.calculateMasteryScore(mastery);
        mastery.level = this.calculateLevel(mastery.score);
        break;

      case 'concept_mastered':
        mastery.level = 'expert';
        mastery.score = 100;
        break;

      case 'hint_requested':
        mastery.weaknesses.push('requested hints');
        break;

      case 'struggle_detected':
        mastery.weaknesses.push('conceptual struggle');
        break;
    }
  }

  private getMasteryOrCreate(conceptId: string): ConceptMastery {
    if (!this.conceptMastery.has(conceptId)) {
      this.conceptMastery.set(conceptId, {
        conceptId,
        conceptName: conceptId,
        level: 'beginner',
        score: 0,
        attempts: 0,
        successes: 0,
        timeSpent: 0,
        lastAttempt: Date.now(),
        strengths: [],
        weaknesses: [],
      });
    }
    return this.conceptMastery.get(conceptId)!;
  }

  private calculateMasteryScore(mastery: ConceptMastery): number {
    if (mastery.attempts === 0) return 0;

    const successRate = mastery.successes / mastery.attempts;
    const attemptFactor = Math.min(mastery.attempts / 5, 1); // Increase with more attempts
    const recencyFactor = this.getRecencyFactor(mastery.lastAttempt);

    return Math.round(successRate * attemptFactor * recencyFactor * 100);
  }

  private getRecencyFactor(lastAttempt: number): number {
    const daysSinceAttempt = (Date.now() - lastAttempt) / (1000 * 60 * 60 * 24);
    // Decay over 14 days
    return Math.max(0.5, 1 - daysSinceAttempt / 14);
  }

  private calculateLevel(score: number): MasteryLevel {
    if (score >= 90) return 'expert';
    if (score >= 70) return 'proficient';
    if (score >= 40) return 'intermediate';
    return 'beginner';
  }

  getMetrics(): LearningMetrics {
    const totalTimeSpent = this.calculateTotalTime();
    const conceptsAttempted = this.conceptMastery.size;
    const conceptsMastered = Array.from(this.conceptMastery.values()).filter(
      (m) => m.level === 'expert'
    ).length;

    const totalAttempts = Array.from(this.conceptMastery.values()).reduce(
      (sum, m) => sum + m.attempts,
      0
    );
    const totalSuccesses = Array.from(this.conceptMastery.values()).reduce(
      (sum, m) => sum + m.successes,
      0
    );

    const averageSuccessRate =
      totalAttempts > 0 ? (totalSuccesses / totalAttempts) * 100 : 0;
    const recentProgress = this.calculateRecentProgress();

    return {
      totalTimeSpent,
      conceptsAttempted,
      conceptsMastered,
      averageSuccessRate: Math.round(averageSuccessRate),
      recentProgress: Math.round(recentProgress),
      conceptMastery: this.conceptMastery,
    };
  }

  private calculateTotalTime(): number {
    // Sum time from session events
    const sessionStart = this.eventHistory[0]?.timestamp || this.sessionStartTime;
    const sessionEnd = this.eventHistory[this.eventHistory.length - 1]?.timestamp || Date.now();
    return sessionEnd - sessionStart;
  }

  private calculateRecentProgress(): number {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentEvents = this.eventHistory.filter(
      (e) => e.timestamp > sevenDaysAgo
    );

    if (recentEvents.length === 0) return 0;

    const masteredInPeriod = recentEvents.filter(
      (e) => e.type === 'concept_mastered'
    ).length;
    return masteredInPeriod;
  }

  getMastery(conceptId: string): ConceptMastery | null {
    return this.conceptMastery.get(conceptId) || null;
  }

  getMasteredConcepts(): ConceptMastery[] {
    return Array.from(this.conceptMastery.values()).filter(
      (m) => m.level === 'expert'
    );
  }

  getStruggleConcepts(): ConceptMastery[] {
    return Array.from(this.conceptMastery.values())
      .filter((m) => m.level === 'beginner' && m.attempts > 0)
      .sort((a, b) => b.attempts - a.attempts);
  }

  getProgressionPath(): ConceptMastery[] {
    return Array.from(this.conceptMastery.values())
      .sort((a, b) => b.lastAttempt - a.lastAttempt);
  }

  reset() {
    this.conceptMastery.clear();
    this.eventHistory = [];
    this.sessionStartTime = Date.now();
  }

  export(): string {
    return JSON.stringify(
      {
        conceptMastery: Array.from(this.conceptMastery.values()),
        metrics: this.getMetrics(),
      },
      null,
      2
    );
  }
}
