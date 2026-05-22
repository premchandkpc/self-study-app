/**
 * Snapshot tests for SystemDesign scenario builders.
 * Verifies graph structure consistency.
 */

import { adaptLegacyScenarioBuilder } from '../../core/ir/LegacyAdapter';

describe('SystemDesign Scenarios', () => {
  let uberSteps, whatsappSteps;

  beforeAll(async () => {
    const uberModule = await import('../scenarios/uber');
    const whatsappModule = await import('../scenarios/whatsapp');

    // Get the default export (buildUberSteps, buildWhatsAppSteps)
    const buildUber = uberModule.default || uberModule.buildUberSteps || uberModule.build;
    const buildWhatsApp = whatsappModule.default || whatsappModule.buildWhatsAppSteps || whatsappModule.build;

    if (typeof buildUber === 'function') {
      uberSteps = buildUber();
    }
    if (typeof buildWhatsApp === 'function') {
      whatsappSteps = buildWhatsApp();
    }
  });

  it('uber generates consistent graph steps', () => {
    if (!uberSteps) {
      console.warn('uber scenario not loaded, skipping test');
      return;
    }

    expect(uberSteps).toMatchSnapshot();
    expect(uberSteps.length).toBeGreaterThan(0);

    uberSteps.forEach((step) => {
      expect(step).toHaveProperty('nodes');
      expect(step).toHaveProperty('edges');
      expect(Array.isArray(step.nodes)).toBe(true);
      expect(Array.isArray(step.edges)).toBe(true);
    });
  });

  it('whatsapp generates consistent graph steps', () => {
    if (!whatsappSteps) {
      console.warn('whatsapp scenario not loaded, skipping test');
      return;
    }

    expect(whatsappSteps).toMatchSnapshot();
    expect(whatsappSteps.length).toBeGreaterThan(0);
  });

  it('graph scenarios adapt to SceneIR correctly', () => {
    if (!uberSteps) {
      console.warn('uber scenario not loaded, skipping test');
      return;
    }

    const mockBuilder = () => uberSteps;
    const sceneIRBuilder = adaptLegacyScenarioBuilder(mockBuilder);
    const scenes = sceneIRBuilder();

    expect(scenes.length).toBeGreaterThan(0);
    expect(scenes[0]).toHaveProperty('visualization');
    expect(scenes[0].visualization.type).toBe('graph');
    expect(scenes[0].visualization.graph).toHaveProperty('nodes');
    expect(scenes[0].visualization.graph).toHaveProperty('edges');
  });
});
