import { SemanticEvent, ArrayCompareEvent, ArraySwapEvent } from '../runtime/events';

export function mergeSortEvents(arr: number[]): SemanticEvent[] {
  const events: SemanticEvent[] = [];
  let frameId = 0;
  const copy = [...arr];

  function merge(left: number, mid: number, right: number): void {
    const leftArr = copy.slice(left, mid + 1);
    const rightArr = copy.slice(mid + 1, right + 1);
    let i = 0;
    let j = 0;
    let k = left;

    while (i < leftArr.length && j < rightArr.length) {
      frameId++;

      events.push({
        type: 'ARRAY_COMPARE',
        frameId,
        timestamp: frameId * 300,
        indices: [left + i, mid + 1 + j],
        concept: 'merge_compare',
        explanation: `Comparing ${leftArr[i]} and ${rightArr[j]} during merge`,
        importance: 'high',
      } as ArrayCompareEvent);

      if (leftArr[i] <= rightArr[j]) {
        copy[k++] = leftArr[i++];
      } else {
        copy[k++] = rightArr[j++];
      }

      frameId++;
      events.push({
        type: 'ARRAY_SWAP',
        frameId,
        timestamp: frameId * 300,
        indices: [k - 1, k],
        concept: 'merge_place',
        explanation: `Placing ${copy[k - 1]} in sorted position`,
        importance: 'medium',
      } as ArraySwapEvent);
    }

    while (i < leftArr.length) {
      copy[k++] = leftArr[i++];
    }

    while (j < rightArr.length) {
      copy[k++] = rightArr[j++];
    }
  }

  function mergeSort(left: number, right: number): void {
    if (left < right) {
      const mid = Math.floor((left + right) / 2);
      mergeSort(left, mid);
      mergeSort(mid + 1, right);
      merge(left, mid, right);
    }
  }

  mergeSort(0, copy.length - 1);
  return events;
}
