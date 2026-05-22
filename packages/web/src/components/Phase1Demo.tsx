import React, { useState, useMemo } from 'react';
import { bubbleSortEvents } from '@/core/algorithms/bubbleSort';
import { quickSortEvents } from '@/core/algorithms/quickSort';
import { mergeSortEvents } from '@/core/algorithms/mergeSort';
import { linearSearchEvents, binarySearchEvents } from '@/core/algorithms/search';
import { useVisualizationEngine } from '@/core/hooks/useVisualizationEngine';
import EventBasedVisualizer from '@/components/visualizers/EventBasedVisualizer';

/**
 * Phase 1 Demo: Complete runtime system
 *
 * Shows:
 * 1. Algorithm → Events (event production)
 * 2. Events → Timeline (frame-based timeline)
 * 3. Timeline → Playback (play/pause/speed control)
 * 4. Playback → React (hook-based state updates)
 * 5. React → Renderer (component rendering)
 */

interface AlgorithmOption {
  id: string;
  name: string;
  execute: (data: number[], target?: number) => any;
  prepareData: () => number[];
  description: string;
}

const ALGORITHMS: AlgorithmOption[] = [
  {
    id: 'bubble',
    name: 'Bubble Sort',
    execute: bubbleSortEvents,
    prepareData: () => [64, 34, 25, 12, 22, 11, 90],
    description: 'Simple comparison-based sort: repeatedly swap adjacent elements'
  },
  {
    id: 'quick',
    name: 'Quick Sort',
    execute: quickSortEvents,
    prepareData: () => [64, 34, 25, 12, 22, 11, 90],
    description: 'Divide-and-conquer: partition around pivot then recursively sort'
  },
  {
    id: 'merge',
    name: 'Merge Sort',
    execute: mergeSortEvents,
    prepareData: () => [64, 34, 25, 12, 22, 11, 90],
    description: 'Divide-and-conquer: split in half, sort each half, merge'
  },
  {
    id: 'linear_search',
    name: 'Linear Search',
    execute: (arr, target = 22) => linearSearchEvents(arr, target),
    prepareData: () => [64, 34, 25, 12, 22, 11, 90],
    description: 'Sequential search: check each element until found'
  },
  {
    id: 'binary_search',
    name: 'Binary Search',
    execute: (arr, target = 22) => binarySearchEvents(arr.sort((a, b) => a - b), target),
    prepareData: () => [11, 12, 22, 25, 34, 64, 90],
    description: 'Divide-and-conquer search: repeatedly halve search space'
  }
];

function ArrayRenderer({ frame }: { frame: any }) {
  if (!frame) return <div>No frame</div>;

  const events = frame.events || [];
  const compared = new Set<number>();
  const swapped = new Set<number>();

  // Extract state from events
  events.forEach((e: any) => {
    if (e.type === 'ARRAY_COMPARE' && e.indices) {
      e.indices.forEach((i: number) => compared.add(i));
    }
    if (e.type === 'ARRAY_SWAP' && e.indices) {
      e.indices.forEach((i: number) => swapped.add(i));
    }
  });

  // This is simplified - in real app would rebuild full state
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '200px' }}>
      {/* Mock rendering - would actually show array */}
      <div style={{ color: '#666', fontSize: '12px' }}>
        Frame {frame.frameId} | Events: {events.length}
      </div>
    </div>
  );
}

export default function Phase1Demo() {
  const [selectedAlgorithmId, setSelectedAlgorithmId] = useState('bubble');
  const [arraySize, setArraySize] = useState(7);
  const [speed, setSpeed] = useState(1);

  const algorithm = useMemo(
    () => ALGORITHMS.find(a => a.id === selectedAlgorithmId)!,
    [selectedAlgorithmId]
  );

  const data = useMemo(() => algorithm.prepareData(), [algorithm]);

  const events = useMemo(() => {
    try {
      return algorithm.execute(data);
    } catch (e) {
      console.error('Algorithm error:', e);
      return [];
    }
  }, [algorithm, data]);

  const engine = useVisualizationEngine({
    events,
    frameDelay: 300,
    speed
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1>Phase 1: Event-Driven Runtime Demo</h1>

      <section style={{ marginBottom: '3rem' }}>
        <h2>How It Works</h2>
        <ol style={{ lineHeight: '1.8' }}>
          <li><strong>Algorithm:</strong> Produces semantic events (COMPARE, SWAP, etc.)</li>
          <li><strong>Timeline:</strong> Organizes events into frames based on frameId</li>
          <li><strong>Playback:</strong> Advances frames with play/pause/speed control</li>
          <li><strong>React Hook:</strong> Subscribes to frame updates, triggers re-renders</li>
          <li><strong>Component:</strong> Renders current frame with UI controls</li>
        </ol>
      </section>

      <section style={{ marginBottom: '3rem', border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
        <h2>Algorithm Selection</h2>

        <div style={{ marginBottom: '1rem' }}>
          <label>
            <strong>Algorithm:</strong>
            <select
              value={selectedAlgorithmId}
              onChange={(e) => setSelectedAlgorithmId(e.target.value)}
              style={{ marginLeft: '0.5rem', padding: '0.5rem' }}
            >
              {ALGORITHMS.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
        </div>

        <p style={{ color: '#666', fontSize: '0.95rem' }}>{algorithm.description}</p>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2>Runtime Statistics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#f0f0f0', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>Total Events</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{events.length}</div>
          </div>
          <div style={{ padding: '1rem', background: '#f0f0f0', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>Total Frames</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{engine.frameCount}</div>
          </div>
          <div style={{ padding: '1rem', background: '#f0f0f0', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>Current Frame</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{engine.frameIndex}/{engine.frameCount}</div>
          </div>
          <div style={{ padding: '1rem', background: '#f0f0f0', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>Progress</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{Math.round(engine.progress)}%</div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2>Playback Controls</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={engine.play}
            disabled={engine.playbackState === 'playing'}
            style={{
              padding: '0.5rem 1rem',
              background: engine.playbackState === 'playing' ? '#ccc' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: engine.playbackState === 'playing' ? 'not-allowed' : 'pointer'
            }}
          >
            ▶ Play
          </button>

          <button
            onClick={engine.pause}
            disabled={engine.playbackState !== 'playing'}
            style={{
              padding: '0.5rem 1rem',
              background: engine.playbackState !== 'playing' ? '#ccc' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: engine.playbackState !== 'playing' ? 'not-allowed' : 'pointer'
            }}
          >
            ⏸ Pause
          </button>

          <button
            onClick={engine.previousFrame}
            disabled={!engine.canRewind()}
            style={{
              padding: '0.5rem 1rem',
              background: !engine.canRewind() ? '#ccc' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: !engine.canRewind() ? 'not-allowed' : 'pointer'
            }}
          >
            ← Prev
          </button>

          <button
            onClick={engine.nextFrame}
            disabled={!engine.canAdvance()}
            style={{
              padding: '0.5rem 1rem',
              background: !engine.canAdvance() ? '#ccc' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: !engine.canAdvance() ? 'not-allowed' : 'pointer'
            }}
          >
            Next →
          </button>

          <button
            onClick={engine.replay}
            style={{
              padding: '0.5rem 1rem',
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ↻ Reset
          </button>

          <div style={{ marginLeft: 'auto' }}>
            <label>
              Speed:
              <select
                value={engine.speed}
                onChange={(e) => engine.setSpeed(parseFloat(e.target.value))}
                style={{ marginLeft: '0.5rem', padding: '0.5rem' }}
              >
                <option value="0.5">0.5x</option>
                <option value="1">1x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2>Progress</h2>
        <div style={{
          width: '100%',
          height: '8px',
          background: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div
            style={{
              height: '100%',
              background: '#3b82f6',
              width: `${engine.progress}%`,
              transition: 'width 0.2s ease'
            }}
          />
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
          {Math.round(engine.progress)}% complete
        </div>
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2>Current Frame Events</h2>
        {engine.currentFrame ? (
          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
            <div><strong>Frame ID:</strong> {engine.currentFrame.frameId}</div>
            <div><strong>Events:</strong> {engine.currentFrame.events.length}</div>
            <div style={{ marginTop: '0.5rem', color: '#666' }}>
              {engine.currentFrame.events.map((e: any, i: number) => (
                <div key={i}>
                  [{e.type}] {e.explanation || JSON.stringify(e)}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>No frame</div>
        )}
      </section>

      <section style={{ marginBottom: '3rem' }}>
        <h2>Key Insight: Event Sourcing</h2>
        <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
          <p>
            <strong>Before:</strong> Component stores full state at each step (huge memory)
          </p>
          <pre style={{ background: '#fff', padding: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem', overflow: 'auto' }}>
{`frames = [
  { array: [1,2,3], ... },
  { array: [1,3,2], ... },
  { array: [3,1,2], ... }
]
// For 10k frames: 50MB!`}
          </pre>

          <p style={{ marginTop: '1rem' }}>
            <strong>After:</strong> Store only events (massive reduction)
          </p>
          <pre style={{ background: '#fff', padding: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem', overflow: 'auto' }}>
{`events = [
  { type: 'SWAP', indices: [1,2] },
  { type: 'SWAP', indices: [2,3] },
  { type: 'SWAP', indices: [0,1] }
]
// For 10k frames: 500KB!`}
          </pre>
        </div>
      </section>

      <section>
        <h2>Next Steps (Phase 2+)</h2>
        <ul style={{ lineHeight: '2' }}>
          <li>✅ <strong>Phase 1:</strong> Runtime engine with events</li>
          <li>📋 <strong>Phase 2:</strong> Convert all algorithms to events</li>
          <li>📋 <strong>Phase 3:</strong> Central renderer (same code for all algorithms)</li>
          <li>📋 <strong>Phase 4:</strong> Timeline enhancements (branching, reverse)</li>
          <li>📋 <strong>Phase 5:</strong> Event sourcing optimization</li>
          <li>📋 <strong>Phase 6+:</strong> AI, plugins, concept graph</li>
        </ul>
      </section>
    </div>
  );
}
