import { KnowledgeGraph } from '../knowledge'

export interface UserPerformance {
  events: { concept: string; accuracy: number; time: number }[]
  mastery: number
  averageTime: number
}

export interface AdaptationResult {
  difficulty: number
  narrationDepth: 'shallow' | 'medium' | 'deep'
  suggestedReview: string[]
  nextScenario: string
}

export class AdaptiveEngine {
  private userProfile: { level: number; weakAreas: string[]; strengths: string[] }
  private kg: KnowledgeGraph

  constructor(kg: KnowledgeGraph) {
    this.kg = kg
    this.userProfile = { level: 1, weakAreas: [], strengths: [] }
  }

  adapt(performance: UserPerformance): AdaptationResult {
    const weakConcepts = this.detectWeakAreas(performance)
    const nextConcept = this.suggestNextConcept(weakConcepts, performance)
    const difficulty = this.calculateDifficulty(performance)

    this.userProfile.weakAreas = weakConcepts
    this.userProfile.level = difficulty

    return {
      difficulty,
      narrationDepth: performance.mastery > 0.7 ? 'deep' : 'shallow',
      suggestedReview: weakConcepts,
      nextScenario: nextConcept,
    }
  }

  private detectWeakAreas(performance: UserPerformance): string[] {
    const weak = new Set<string>()
    const avgTime = performance.averageTime || 1000
    for (const event of performance.events) {
      if (event.accuracy < 0.6 || event.time > avgTime * 1.5) {
        weak.add(event.concept)
      }
    }
    return Array.from(weak)
  }

  private suggestNextConcept(weakAreas: string[], performance: UserPerformance): string {
    const allConcepts = this.kg.getAllConcepts()
    const mastered = new Set(
      performance.events.filter(e => e.accuracy >= 0.7).map(e => e.concept)
    )
    const candidates = allConcepts
      .filter(c => !mastered.has(c.id) && !weakAreas.includes(c.id))
      .sort((a, b) => {
        if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty
        return b.interviewFrequency - a.interviewFrequency
      })
    return candidates[0]?.id ?? 'review-complete'
  }

  private calculateDifficulty(performance: UserPerformance): number {
    if (performance.mastery >= 0.9) return Math.min(this.userProfile.level + 1, 5)
    if (performance.mastery < 0.4) return Math.max(this.userProfile.level - 1, 1)
    return this.userProfile.level
  }

  getUserProfile(): { level: number; weakAreas: string[]; strengths: string[] } {
    return { ...this.userProfile }
  }
}
