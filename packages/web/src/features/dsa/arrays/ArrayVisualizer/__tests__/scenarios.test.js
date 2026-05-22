/**
 * Snapshot tests for DSA scenario builders.
 * Verifies that scenario.build() returns consistent shape.
 * Catch regressions in step generation.
 */

import slidingWindow from '../scenarios/sliding-window';
import twoPointers from '../scenarios/two-pointers';
import { adaptLegacyScenarioBuilder } from '../../core/ir/LegacyAdapter';

describe('DSA Scenarios', () => {
  describe('sliding-window', () => {
    it('generates consistent steps for default params', () => {
      const steps = slidingWindow.build();
      expect(steps).toMatchSnapshot();
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0]).toHaveProperty('cells');
      expect(steps[0]).toHaveProperty('window');
      expect(steps[0]).toHaveProperty('vars');
      expect(steps[0]).toHaveProperty('complexity');
    });

    it('adapts to SceneIR correctly', () => {
      const sceneIRBuilder = adaptLegacyScenarioBuilder(slidingWindow.build);
      const scenes = sceneIRBuilder();
      expect(scenes.length).toBeGreaterThan(0);
      expect(scenes[0]).toHaveProperty('id');
      expect(scenes[0]).toHaveProperty('visualization');
      expect(scenes[0].visualization.type).toBe('dsa-array');
      expect(scenes[0].visualization.array).toHaveProperty('cells');
    });

    it('respects custom input params', () => {
      const params = { arr: [1, 2, 3, 4, 5], k: 2 };
      const steps = slidingWindow.build(params);
      expect(steps).toMatchSnapshot();
    });
  });

  describe('two-pointers', () => {
    it('generates consistent steps for default params', () => {
      const steps = twoPointers.build();
      expect(steps).toMatchSnapshot();
      expect(steps.length).toBeGreaterThan(0);
    });
  });

  describe('backwards compatibility', () => {
    it('old viz shape has all required fields', () => {
      const steps = slidingWindow.build();
      steps.forEach((step) => {
        expect(step).toHaveProperty('cells');
        expect(Array.isArray(step.cells)).toBe(true);
        expect(step.cells.length).toBeGreaterThan(0);
      });
    });
  });
});
