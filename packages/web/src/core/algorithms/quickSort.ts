import { SemanticEvent, ArrayCompareEvent, ArraySwapEvent } from '../runtime/events';

export function quickSortEvents(arr: number[]): SemanticEvent[] {
  const events: SemanticEvent[] = [];
  let frameId = 0;
  const copy = [...arr];

  function partition(low: number, high: number): number {
    const pivot = copy[high];
    let i = low - 1;

    for (let j = low; j < high; j++) {
      frameId++;

      events.push({
        type: 'ARRAY_COMPARE',
        frameId,
        timestamp: frameId * 300,
        indices: [j, high],
        concept: 'partition_compare',
        explanation: `Comparing ${copy[j]} with pivot ${pivot}`,
        importance: 'high',
      } as ArrayCompareEvent);

      if (copy[j] < pivot) {
        i++;
        frameId++;
        [copy[i], copy[j]] = [copy[j], copy[i]];

        events.push({
          type: 'ARRAY_SWAP',
          frameId,
          timestamp: frameId * 300,
          indices: [i, j],
          concept: 'partitioning',
          explanation: `Swapping ${copy[j]} and ${copy[i]} during partitioning`,
          importance: 'high',
        } as ArraySwapEvent);
      }
    }

    frameId++;
    [copy[i + 1], copy[high]] = [copy[high], copy[i + 1]];

    events.push({
      type: 'ARRAY_SWAP',
      frameId,
      timestamp: frameId * 300,
      indices: [i + 1, high],
      concept: 'pivot_placement',
      explanation: `Placing pivot ${copy[i + 1]} in final position`,
      importance: 'critical',
    } as ArraySwapEvent);

    return i + 1;
  }

  function quickSort(low: number, high: number): void {
    if (low < high) {
      const pi = partition(low, high);
      quickSort(low, pi - 1);
      quickSort(pi + 1, high);
    }
  }

  quickSort(0, copy.length - 1);
  return events;
}
