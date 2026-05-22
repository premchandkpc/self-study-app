import { VisualizationEngine } from '../engine';
import { SemanticEvent, ArraySwapEvent } from '../events';

describe('VisualizationEngine', () => {
  const createMockEvents = (): SemanticEvent[] => [
    {
      type: 'ARRAY_COMPARE',
      frameId: 1,
      timestamp: 300,
      indices: [0, 1],
    },
    {
      type: 'ARRAY_SWAP',
      frameId: 2,
      timestamp: 600,
      indices: [0, 1],
    } as ArraySwapEvent,
    {
      type: 'ARRAY_COMPARE',
      frameId: 3,
      timestamp: 900,
      indices: [1, 2],
    },
  ];

  describe('frame navigation', () => {
    it('should initialize at frame 0', () => {
      const events = createMockEvents();
      const engine = new VisualizationEngine(events);

      expect(engine.getCurrentFrameIndex()).toBe(0);
      expect(engine.getFrameCount()).toBe(3);
    });

    it('should advance to next frame', () => {
      const events = createMockEvents();
      const engine = new VisualizationEngine(events);

      engine.nextFrame();
      expect(engine.getCurrentFrameIndex()).toBe(1);

      engine.nextFrame();
      expect(engine.getCurrentFrameIndex()).toBe(2);
    });

    it('should rewind to previous frame', () => {
      const events = createMockEvents();
      const engine = new VisualizationEngine(events);

      engine.nextFrame();
      engine.nextFrame();
      engine.previousFrame();

      expect(engine.getCurrentFrameIndex()).toBe(1);
    });

    it('should seek to specific frame', () => {
      const events = createMockEvents();
      const engine = new VisualizationEngine(events);

      engine.seekToFrame(2);
      expect(engine.getCurrentFrameIndex()).toBe(1);

      engine.seekToFrame(3);
      expect(engine.getCurrentFrameIndex()).toBe(2);
    });

    it('should return correct events for current frame', () => {
      const events = createMockEvents();
      const engine = new VisualizationEngine(events);

      const currentEvents = engine.getCurrentEvents();
      expect(currentEvents.length).toBe(1);
      expect(currentEvents[0].type).toBe('ARRAY_COMPARE');
      expect(currentEvents[0].frameId).toBe(1);
    });
  });

  describe('progress tracking', () => {
    it('should calculate progress correctly', () => {
      const events = createMockEvents();
      const engine = new VisualizationEngine(events);

      expect(engine.getProgress()).toBe(0);

      engine.nextFrame();
      expect(engine.getProgress()).toBe(50);

      engine.nextFrame();
      expect(engine.getProgress()).toBe(100);
    });
  });

  describe('frame boundaries', () => {
    it('should not advance past last frame', () => {
      const events = createMockEvents();
      const engine = new VisualizationEngine(events);

      for (let i = 0; i < 10; i++) {
        engine.nextFrame();
      }

      expect(engine.getCurrentFrameIndex()).toBe(2);
    });

    it('should not rewind before first frame', () => {
      const events = createMockEvents();
      const engine = new VisualizationEngine(events);

      for (let i = 0; i < 10; i++) {
        engine.previousFrame();
      }

      expect(engine.getCurrentFrameIndex()).toBe(0);
    });

    it('canAdvance should return correct state', () => {
      const events = createMockEvents();
      const engine = new VisualizationEngine(events);

      expect(engine.canAdvance()).toBe(true);
      engine.nextFrame();
      expect(engine.canAdvance()).toBe(true);
      engine.nextFrame();
      expect(engine.canAdvance()).toBe(false);
    });

    it('canRewind should return correct state', () => {
      const events = createMockEvents();
      const engine = new VisualizationEngine(events);

      expect(engine.canRewind()).toBe(false);
      engine.nextFrame();
      expect(engine.canRewind()).toBe(true);
    });
  });

  describe('event handling', () => {
    it('should add events and rebuild timeline', () => {
      const engine = new VisualizationEngine();

      expect(engine.getFrameCount()).toBe(0);

      const newEvent: SemanticEvent = {
        type: 'ARRAY_COMPARE',
        frameId: 1,
        timestamp: 300,
        indices: [0, 1],
      };

      engine.addEvent(newEvent);
      expect(engine.getFrameCount()).toBe(1);
      expect(engine.getCurrentEvents()[0].type).toBe('ARRAY_COMPARE');
    });

    it('should maintain event log', () => {
      const events = createMockEvents();
      const engine = new VisualizationEngine(events);

      const log = engine.getEventLog();
      expect(log.length).toBe(3);
      expect(log).toEqual(events);
    });
  });

  describe('replay', () => {
    it('should reset to initial state', () => {
      const events = createMockEvents();
      const engine = new VisualizationEngine(events);

      engine.nextFrame();
      engine.nextFrame();
      engine.replay();

      expect(engine.getCurrentFrameIndex()).toBe(0);
      expect(engine.getRuntimeState()).toBe('idle');
    });
  });

  describe('speed control', () => {
    it('should allow speed adjustment', () => {
      const engine = new VisualizationEngine();

      engine.setSpeed(0.5);
      expect(engine.getSpeed()).toBe(0.5);

      engine.setSpeed(2);
      expect(engine.getSpeed()).toBe(2);

      // Speed should be clamped to 0.1-5
      engine.setSpeed(10);
      expect(engine.getSpeed()).toBe(5);

      engine.setSpeed(0.05);
      expect(engine.getSpeed()).toBe(0.1);
    });
  });
});
