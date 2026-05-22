import { SemanticEvent, ArrayCompareEvent } from '../runtime/events';

export function linearSearchEvents(arr: number[], target: number): SemanticEvent[] {
  const events: SemanticEvent[] = [];
  let frameId = 0;

  for (let i = 0; i < arr.length; i++) {
    frameId++;

    if (arr[i] === target) {
      events.push({
        type: 'ARRAY_COMPARE',
        frameId,
        timestamp: frameId * 300,
        indices: [i],
        concept: 'found_element',
        explanation: `Found target ${target} at index ${i}`,
        importance: 'critical',
      } as ArrayCompareEvent);
      break;
    } else {
      events.push({
        type: 'ARRAY_COMPARE',
        frameId,
        timestamp: frameId * 300,
        indices: [i],
        concept: 'check_element',
        explanation: `Checking index ${i}: ${arr[i]} != ${target}`,
        importance: 'medium',
      } as ArrayCompareEvent);
    }
  }

  return events;
}

export function binarySearchEvents(arr: number[], target: number): SemanticEvent[] {
  const events: SemanticEvent[] = [];
  let frameId = 0;
  let low = 0;
  let high = arr.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    frameId++;

    events.push({
      type: 'ARRAY_COMPARE',
      frameId,
      timestamp: frameId * 300,
      indices: [mid],
      concept: 'midpoint_check',
      explanation: `Checking midpoint ${mid}: value = ${arr[mid]}`,
      importance: 'high',
    } as ArrayCompareEvent);

    if (arr[mid] === target) {
      frameId++;
      events.push({
        type: 'ARRAY_COMPARE',
        frameId,
        timestamp: frameId * 300,
        indices: [mid],
        concept: 'found_element',
        explanation: `Found target ${target} at index ${mid}`,
        importance: 'critical',
      } as ArrayCompareEvent);
      break;
    } else if (arr[mid] < target) {
      frameId++;
      events.push({
        type: 'ARRAY_COMPARE',
        frameId,
        timestamp: frameId * 300,
        indices: [mid, high],
        concept: 'binary_search_range',
        explanation: `${arr[mid]} < ${target}, searching right half`,
        importance: 'high',
      } as ArrayCompareEvent);
      low = mid + 1;
    } else {
      frameId++;
      events.push({
        type: 'ARRAY_COMPARE',
        frameId,
        timestamp: frameId * 300,
        indices: [low, mid],
        concept: 'binary_search_range',
        explanation: `${arr[mid]} > ${target}, searching left half`,
        importance: 'high',
      } as ArrayCompareEvent);
      high = mid - 1;
    }
  }

  return events;
}
