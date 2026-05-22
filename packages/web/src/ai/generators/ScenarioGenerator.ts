import { KnowledgeGraph } from '../../knowledge'
import type { Scenario } from '../../knowledge'
import type { LLMProvider } from '../providers/LLMProvider'

export class ScenarioGenerator {
  private kg: KnowledgeGraph
  private llm?: LLMProvider

  constructor(kg: KnowledgeGraph, llm?: LLMProvider) {
    this.kg = kg
    this.llm = llm
  }

  async generate(conceptId: string, difficulty: number = 1): Promise<Scenario> {
    const concept = this.kg.getConcept(conceptId)
    if (!concept) throw new Error(`Concept "${conceptId}" not found`)

    if (this.llm) {
      const prompt = `Generate a simulation scenario for teaching "${concept.name}" (difficulty: ${difficulty}/5). Prereqs: ${concept.prerequisites.join(', ')}. Return as JSON with title, description, initialState (entities,graph), events (type,entityId,property,oldValue,newValue,concept,explanation), questions.`
      try {
        const response = await this.llm.generate(prompt, { temperature: 0.7, maxTokens: 4096 })
        const parsed = JSON.parse(response.text)
        return { id: `scenario-${conceptId}-${Date.now()}`, ...parsed, conceptId, difficulty }
      } catch {
        return this.fallbackGenerate(concept, difficulty)
      }
    }
    return this.fallbackGenerate(concept, difficulty)
  }

  private fallbackGenerate(concept: { id: string; name: string; description: string; category: string; difficulty: number; visualType?: string }, difficulty: number): Scenario {
    const entities = [
      { id: 'root', kind: 'node', type: concept.category, properties: { label: concept.name, description: concept.description } },
    ]
    const events = [
      { type: 'ENTITY_CREATED', timestamp: 0, entityId: 'root', concept: concept.id, explanation: `Initializing ${concept.name} simulation. ${concept.description}` },
    ]
    if (concept.visualType === 'array') {
      entities.push({ id: 'arr', kind: 'node', type: 'array-element', properties: { size: 8, elements: [5, 3, 8, 1, 9, 2, 7, 4] } })
      events.push({ type: 'PROPERTY_CHANGED', timestamp: 1, entityId: 'arr', property: 'elements', newValue: [5, 3, 8, 1, 9, 2, 7, 4], concept: concept.id, explanation: `Array initialized with 8 elements for visualization.` })
    }
    if (concept.visualType === 'graph') {
      entities.push({ id: 'node1', kind: 'node', type: 'graph-node', properties: { label: 'A' } })
      entities.push({ id: 'node2', kind: 'node', type: 'graph-node', properties: { label: 'B' } })
      events.push({ type: 'EDGE_ADDED', timestamp: 1, entityId: 'root', property: 'edge', newValue: { from: 'node1', to: 'node2' }, concept: concept.id, explanation: `Edge created between nodes in ${concept.name}.` })
    }
    return {
      id: `scenario-${concept.id}-${Date.now()}`,
      title: `${concept.name} - Interactive Simulation`,
      description: concept.description,
      conceptId: concept.id,
      difficulty,
      initialState: { entities, edges: [] },
      events,
      questions: [
        { text: `Explain how ${concept.name} works and its complexity.`, answer: concept.description, difficulty },
        { text: `What are the key operations in ${concept.name}?`, answer: 'Depends on the specific data structure or algorithm', difficulty: Math.min(difficulty + 1, 5) },
      ],
    }
  }
}
