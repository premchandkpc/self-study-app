// Recommendation Engine - Suggest next concepts based on mastery
// Uses knowledge graph + mastery tracker for adaptive learning paths

import { KnowledgeGraph, Concept } from '../graph/KnowledgeGraph';
import { MasteryTracker, ConceptMastery } from '../analytics/MasteryTracker';

export interface Recommendation {
  conceptId: string;
  conceptName: string;
  reason: string;
  difficulty: number;
  score: number; // Higher = better recommendation
  nextSteps: string[];
}

export interface LearningPath {
  concepts: string[];
  totalDifficulty: number;
  estimatedTime: number; // minutes
  description: string;
}

export class RecommendationEngine {
  constructor(
    private knowledgeGraph: KnowledgeGraph,
    private masteryTracker: MasteryTracker
  ) {}

  // Get next recommended concepts
  getNextRecommendations(count: number = 5): Recommendation[] {
    const metrics = this.masteryTracker.getMetrics();
    const mastered = this.masteryTracker.getMasteredConcepts();
    const masteredIds = new Set(mastered.map((m) => m.conceptId));

    const candidates: Recommendation[] = [];

    // Find unmastered concepts whose prerequisites are met
    metrics.conceptMastery.forEach((mastery) => {
      if (masteredIds.has(mastery.conceptId)) return; // Already mastered

      const concept = this.knowledgeGraph.getConcept(mastery.conceptId);
      if (!concept) return;

      // Check prerequisites
      const prereqsMet = (concept.prerequisites || []).every((prereq) =>
        masteredIds.has(prereq)
      );

      if (!prereqsMet) return; // Prerequisites not met

      const score = this.calculateRecommendationScore(mastery, concept, metrics);
      const reason = this.generateReason(mastery, concept, prereqsMet);

      candidates.push({
        conceptId: mastery.conceptId,
        conceptName: concept.name,
        reason,
        difficulty: concept.difficulty || 2,
        score,
        nextSteps: this.getNextSteps(concept, mastery),
      });
    });

    // Sort by score and return top N
    return candidates.sort((a, b) => b.score - a.score).slice(0, count);
  }

  // Generate learning path from current state to target
  generateLearningPath(targetConceptId: string): LearningPath | null {
    const targetConcept = this.knowledgeGraph.getConcept(targetConceptId);
    if (!targetConcept) return null;

    const metrics = this.masteryTracker.getMetrics();
    const masteredIds = new Set(
      Array.from(metrics.conceptMastery.values())
        .filter((m) => m.level === 'expert')
        .map((m) => m.conceptId)
    );

    // BFS to find shortest path
    const path: string[] = [];
    const queue: string[] = [targetConceptId];
    const visited = new Set<string>();
    const parent = new Map<string, string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const concept = this.knowledgeGraph.getConcept(current);
      if (!concept) continue;

      // Found a mastered concept, reconstruct path
      if (masteredIds.has(current)) {
        let node = current;
        while (node) {
          path.unshift(node);
          node = parent.get(node)!;
        }
        break;
      }

      // Add prerequisites to queue
      (concept.prerequisites || []).forEach((prereq) => {
        if (!visited.has(prereq)) {
          parent.set(prereq, current);
          queue.push(prereq);
        }
      });
    }

    if (path.length === 0) {
      // Target concept itself
      path.push(targetConceptId);
    }

    const totalDifficulty = path.reduce((sum, cid) => {
      const c = this.knowledgeGraph.getConcept(cid);
      return sum + (c?.difficulty || 2);
    }, 0);

    return {
      concepts: path,
      totalDifficulty,
      estimatedTime: totalDifficulty * 15, // 15 min per difficulty level
      description: `Learn ${targetConcept.name}: ${path.length} concepts in sequence`,
    };
  }

  // Get concepts related to current progress
  getRelatedConcepts(conceptId: string): Recommendation[] {
    const concept = this.knowledgeGraph.getConcept(conceptId);
    if (!concept) return [];

    const metrics = this.masteryTracker.getMetrics();
    const related: Recommendation[] = [];

    // Get concepts this enables
    (concept.enabledBy || []).forEach((enabledId) => {
      const enabled = this.knowledgeGraph.getConcept(enabledId);
      if (!enabled) return;

      const mastery = metrics.conceptMastery.get(enabledId);
      if (!mastery || mastery.level === 'expert') return;

      const score = this.calculateRelatedScore(mastery, enabled);
      related.push({
        conceptId: enabledId,
        conceptName: enabled.name,
        reason: `Builds on ${concept.name}`,
        difficulty: enabled.difficulty || 2,
        score,
        nextSteps: this.getNextSteps(enabled, mastery),
      });
    });

    // Get related concepts
    (concept.related || []).forEach((relatedId) => {
      const related2 = this.knowledgeGraph.getConcept(relatedId);
      if (!related2) return;

      const mastery = metrics.conceptMastery.get(relatedId);
      if (!mastery || mastery.level === 'expert') return;

      const score = this.calculateRelatedScore(mastery, related2);
      related.push({
        conceptId: relatedId,
        conceptName: related2.name,
        reason: `Related to ${concept.name}`,
        difficulty: related2.difficulty || 2,
        score,
        nextSteps: this.getNextSteps(related2, mastery),
      });
    });

    return related.sort((a, b) => b.score - a.score);
  }

  private calculateRecommendationScore(
    mastery: ConceptMastery,
    concept: Concept,
    metrics: any
  ): number {
    let score = 0;

    // Prefer struggled concepts (more attempts = more need)
    score += Math.min(mastery.attempts, 5) * 15;

    // Prefer concepts at intermediate level (not too easy, not too hard)
    const difficultyScore = 50 - Math.abs((concept.difficulty || 2) * 10 - 25);
    score += difficultyScore;

    // Prefer enabling other unmastered concepts
    const enableCount = (concept.enabledBy || []).length;
    score += enableCount * 10;

    // Prefer based on success history
    if (mastery.attempts > 0) {
      const successRate = mastery.successes / mastery.attempts;
      score += (successRate > 0.5 ? 10 : -10);
    }

    return score;
  }

  private calculateRelatedScore(
    mastery: ConceptMastery,
    concept: Concept
  ): number {
    let score = 0;

    // Distance to mastery
    const masteryGap = 100 - mastery.score;
    score += masteryGap * 0.5;

    // Recent activity
    const hoursSinceAttempt = (Date.now() - mastery.lastAttempt) / (1000 * 60 * 60);
    if (hoursSinceAttempt < 24) {
      score += 20;
    }

    // Difficulty match
    score += 50 - Math.abs((concept.difficulty || 2) * 10 - 25);

    return score;
  }

  private generateReason(
    mastery: ConceptMastery,
    concept: Concept,
    prereqsMet: boolean
  ): string {
    if (!prereqsMet) return 'Prerequisites not yet met';

    if (mastery.attempts === 0) {
      return 'Ready to learn';
    }

    if (mastery.score < 40) {
      return `Needs more practice (${Math.round(mastery.score)}% mastery)`;
    }

    if (mastery.score < 70) {
      return `Getting closer to mastery (${Math.round(mastery.score)}% mastery)`;
    }

    return `Nearly mastered (${Math.round(mastery.score)}% mastery)`;
  }

  private getNextSteps(concept: Concept, mastery: ConceptMastery): string[] {
    const steps: string[] = [];

    if (mastery.attempts === 0) {
      steps.push('Start with an introductory lesson');
    } else if (mastery.weaknesses.length > 0) {
      steps.push(`Review: ${mastery.weaknesses[0]}`);
    } else {
      steps.push('Try advanced problems');
    }

    if ((concept.prerequisites || []).length > 0) {
      steps.push('Review prerequisites if struggling');
    }

    steps.push('Request hints if needed');

    return steps;
  }
}
