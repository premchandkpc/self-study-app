import { KnowledgeGraph } from '../../knowledge'
import type { InterviewQuestion, Difficulty } from '../../knowledge'

export class InterviewGenerator {
  private kg: KnowledgeGraph

  constructor(kg: KnowledgeGraph) {
    this.kg = kg
  }

  generateQuestions(conceptId: string, count: number = 3): InterviewQuestion[] {
    const concept = this.kg.getConcept(conceptId)
    if (!concept) return []

    const d = concept.difficulty
    const questions: InterviewQuestion[] = []

    questions.push({
      type: 'coding',
      difficulty: d,
      question: `Implement ${concept.name}${d <= 2 ? ' from scratch' : ' with all edge cases'}`,
      testCases: this.generateTestCases(concept.name, d),
      solution: concept.description,
      hints: concept.relatedConcepts.slice(0, 3),
    })

    questions.push({
      type: 'conceptual',
      difficulty: d,
      question: `Explain how ${concept.name} works and when you would use it`,
      expectedKeywords: [concept.name, ...concept.relatedConcepts.slice(0, 3)],
      followUp: `What is the time/space complexity of ${concept.name}?`,
    })

    if (d >= 2) {
      questions.push({
        type: 'system-design',
        difficulty: Math.min(d + 1, 5) as Difficulty,
        question: `Design a system that uses ${concept.name}${d >= 3 ? ' at scale' : ''}`,
        evaluationCriteria: ['Correctness', 'Scalability', 'Edge cases', 'Trade-offs'],
      })
    }

    return questions.slice(0, count)
  }

  private generateTestCases(conceptName: string, _difficulty: number): { input: string; expected: string }[] {
    return [
      { input: `${conceptName} with basic input`, expected: 'Expected output 1' },
      { input: `${conceptName} with edge case`, expected: 'Expected output 2' },
      { input: `${conceptName} with large input`, expected: 'Expected output 3' },
    ]
  }
}
