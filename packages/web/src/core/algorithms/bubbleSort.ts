import { SemanticEvent, ArrayCompareEvent, ArraySwapEvent } from '../runtime/events';

// Bubble Sort: pure algorithm that produces EVENTS, not imperative rendering
// Same algorithm, but outputs semantic event stream instead of mutating state

export function bubbleSortEvents(arr: number[]): SemanticEvent[] {
  const events: SemanticEvent[] = [];
  let frameId = 0;
  const copy = [...arr];
  const n = copy.length;

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      frameId++;

      // Event: comparison happening
      events.push({
        type: 'ARRAY_COMPARE',
        frameId,
        timestamp: frameId * 300,
        indices: [j, j + 1],
        concept: 'comparison',
        explanation: `Comparing elements at index ${j} and ${j + 1}`,
        importance: 'high',
      } as ArrayCompareEvent);

      // Swap if needed
      if (copy[j] > copy[j + 1]) {
        frameId++;
        [copy[j], copy[j + 1]] = [copy[j + 1], copy[j]];

        events.push({
          type: 'ARRAY_SWAP',
          frameId,
          timestamp: frameId * 300,
          indices: [j, j + 1],
          concept: 'swap_operation',
          explanation: `Swapping elements (${copy[j + 1]} < ${copy[j]})`,
          complexity: 'O(1)',
          importance: 'high',
        } as ArraySwapEvent);
      }
    }
  }

  return events;
}

// Example usage:
// const arr = [64, 34, 25, 12, 22, 11, 90];
// const events = bubbleSortEvents(arr);
// engine.addEvent(...events);
// engine.play();
