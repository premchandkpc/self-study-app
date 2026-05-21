// Knowledge Graph - Models concept relationships
// Enables: recommendations, prerequisites, adaptive learning

export interface ConceptNode {
  id: string;
  title: string;
  domain: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  description?: string;
  estimatedMinutes?: number;
  misconceptions?: string[];
  keywords?: string[];
}

export interface ConceptEdge {
  from: string;
  to: string;
  type: 'prerequisite' | 'related' | 'enables' | 'conflicts';
  weight?: number;
}

export interface LearningPath {
  concepts: string[];
  estimatedMinutes: number;
  difficulty: number;
}

export class KnowledgeGraph {
  private nodes: Map<string, ConceptNode> = new Map();
  private edges: Map<string, ConceptEdge[]> = new Map();
  private reverseEdges: Map<string, string[]> = new Map();

  addConcept(concept: ConceptNode): void {
    this.nodes.set(concept.id, concept);
    if (!this.edges.has(concept.id)) {
      this.edges.set(concept.id, []);
    }
    if (!this.reverseEdges.has(concept.id)) {
      this.reverseEdges.set(concept.id, []);
    }
  }

  addEdge(edge: ConceptEdge): void {
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
      throw new Error(`Missing concept: ${edge.from} or ${edge.to}`);
    }

    if (!this.edges.has(edge.from)) {
      this.edges.set(edge.from, []);
    }
    this.edges.get(edge.from)!.push(edge);

    if (!this.reverseEdges.has(edge.to)) {
      this.reverseEdges.set(edge.to, []);
    }
    this.reverseEdges.get(edge.to)!.push(edge.from);
  }

  // Prerequisite traversal
  getPrerequisites(conceptId: string): ConceptNode[] {
    const prerequisites: ConceptNode[] = [];
    const visited = new Set<string>();

    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const edges = this.edges.get(id) ?? [];
      edges
        .filter((e) => e.type === 'prerequisite')
        .forEach((e) => {
          const prereq = this.nodes.get(e.to);
          if (prereq) {
            prerequisites.push(prereq);
            traverse(e.to);
          }
        });
    };

    traverse(conceptId);
    return prerequisites;
  }

  // What does this enable?
  getEnabled(conceptId: string): ConceptNode[] {
    const enabled: ConceptNode[] = [];
    const visited = new Set<string>();

    const traverse = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const incomingEdges = this.reverseEdges.get(id) ?? [];
      incomingEdges.forEach((fromId) => {
        const edges = this.edges.get(fromId) ?? [];
        edges
          .filter((e) => e.type === 'prerequisite' && e.to === id)
          .forEach((e) => {
            const enabledConcept = this.nodes.get(fromId);
            if (enabledConcept) {
              enabled.push(enabledConcept);
              traverse(fromId);
            }
          });
      });
    };

    traverse(conceptId);
    return enabled;
  }

  // Related concepts
  getRelated(conceptId: string): ConceptNode[] {
    const related: ConceptNode[] = [];
    const edges = this.edges.get(conceptId) ?? [];

    edges
      .filter((e) => e.type === 'related')
      .forEach((e) => {
        const concept = this.nodes.get(e.to);
        if (concept) related.push(concept);
      });

    return related;
  }

  // Generate learning path
  generateLearningPath(targetId: string): LearningPath {
    const prerequisites = this.getPrerequisites(targetId);
    const allConcepts = [...prerequisites];

    const target = this.nodes.get(targetId);
    if (target) allConcepts.push(target);

    const estimatedMinutes = allConcepts.reduce(
      (sum, c) => sum + (c.estimatedMinutes ?? 10),
      0
    );

    const avgDifficulty =
      allConcepts.reduce((sum, c) => sum + c.difficulty, 0) /
      allConcepts.length;

    return {
      concepts: allConcepts.map((c) => c.id),
      estimatedMinutes,
      difficulty: Math.ceil(avgDifficulty),
    };
  }

  // Recommend next concepts based on mastered
  recommendNext(masteredIds: string[]): ConceptNode[] {
    const masteredSet = new Set(masteredIds);
    const candidates = new Map<string, number>();

    // For each mastered concept, find what it enables
    masteredIds.forEach((id) => {
      const enabled = this.getEnabled(id);
      enabled.forEach((concept) => {
        if (!masteredSet.has(concept.id)) {
          const prereqs = this.getPrerequisites(concept.id);
          const masteredPrereqs = prereqs.filter((p) =>
            masteredSet.has(p.id)
          ).length;
          candidates.set(concept.id, masteredPrereqs);
        }
      });
    });

    // Sort by how many prerequisites are met
    return Array.from(candidates.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => this.nodes.get(id)!)
      .filter(Boolean);
  }

  // Search concepts
  search(query: string): ConceptNode[] {
    const q = query.toLowerCase();
    return Array.from(this.nodes.values()).filter(
      (concept) =>
        concept.title.toLowerCase().includes(q) ||
        concept.description?.toLowerCase().includes(q) ||
        concept.keywords?.some((k) => k.toLowerCase().includes(q))
    );
  }

  // Export for visualization
  export() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()).flat(),
    };
  }

  getConcept(id: string): ConceptNode | undefined {
    return this.nodes.get(id);
  }

  getAllConcepts(): ConceptNode[] {
    return Array.from(this.nodes.values());
  }
}
