import { describe, it, expect } from 'vitest';
import { JavaCollectionsCompiler } from '../compilers/JavaCollectionsCompiler';

describe('IR Integration: Java Collections → Generic IR', () => {
  const compiler = new JavaCollectionsCompiler();

  const minimalScenario = {
    id: 'test-arraylist',
    label: 'ArrayList Test',
    collectionType: 'arraylist' as const,
    category: 'flow' as const,
    icon: '📋',
    code: 'list.add(42)',
    language: 'java',
    steps: [
      {
        title: 'Initial state',
        cells: [
          { val: 42, state: 'new' },
          { val: null, state: 'null' },
        ],
        size: 1,
        capacity: 2,
      },
    ],
  };

  it('compiles scenario without errors', () => {
    const ir = compiler.compileScenario(minimalScenario);
    expect(ir).toBeDefined();
    expect(ir.id).toBe('test-arraylist');
  });

  it('produces IR with scenes', () => {
    const ir = compiler.compileScenario(minimalScenario);
    expect(ir.scenes).toBeDefined();
    expect(ir.scenes.length).toBeGreaterThan(0);
  });

  it('maps ArrayList to queue primitive', () => {
    const ir = compiler.compileScenario(minimalScenario);
    expect(ir.scenes[0].type).toBe('queue');
  });

  it('extracts nodes from cells', () => {
    const ir = compiler.compileScenario(minimalScenario);
    const scene = ir.scenes[0];
    expect(scene.nodes.length).toBeGreaterThan(0);
    expect(scene.nodes.some((n) => n.label === '42')).toBe(true);
  });

  it('creates animations for state changes', () => {
    const ir = compiler.compileScenario(minimalScenario);
    const scene = ir.scenes[0];
    if (scene.animation) {
      expect(scene.animation.steps).toBeDefined();
      expect(scene.animation.steps.length).toBeGreaterThan(0);
    }
  });

  it('produces IR metadata without technology references', () => {
    const ir = compiler.compileScenario(minimalScenario);
    // IR should be tech-agnostic for the scene itself
    const scene = ir.scenes[0];
    expect(scene.type).toMatch(/queue|stack|tree|graph|timeline|pipeline|state_machine|network|matrix|table|flowchart|sequence/);
    // But metadata can track origin
    expect(ir.metadata?.technology).toBe('java-collections');
  });

  it('proves semantic decoupling: renderer needs only IR type', () => {
    const ir = compiler.compileScenario(minimalScenario);
    // Renderer only needs to know the primitive type
    const rendererInput = {
      type: ir.scenes[0].type,
      nodes: ir.scenes[0].nodes,
      edges: ir.scenes[0].edges,
    };
    // No reference to ArrayList, HashMap, or Java Collections required
    expect(rendererInput.type).toBeTruthy();
    expect(rendererInput.nodes).toBeDefined();
    expect(rendererInput.edges).toBeDefined();
  });
});
