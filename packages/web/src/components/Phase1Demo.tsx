import { useState, useMemo } from 'react';
import { bubbleSortEvents } from '@/core/algorithms/bubbleSort';
import { quickSortEvents } from '@/core/algorithms/quickSort';
import { mergeSortEvents } from '@/core/algorithms/mergeSort';
import { linearSearchEvents, binarySearchEvents } from '@/core/algorithms/search';
import { useVisualizationEngine } from '@/core/hooks/useVisualizationEngine';
import { ArrayRenderer } from '@/core/renderers/ArrayRenderer';

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


export default function Phase1Demo() {
  const [selectedAlgorithmId, setSelectedAlgorithmId] = useState('bubble');
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <h1 style={{ color: '#667eea', marginTop: 0 }}>Phase 1: Event-Driven Runtime Demo</h1>

      <section style={{ marginBottom: '3rem', padding: '1.5rem', borderRadius: '8px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
        <h2>How It Works</h2>
        <ol style={{ lineHeight: '1.8' }}>
          <li><strong>Algorithm:</strong> Produces semantic events (COMPARE, SWAP, etc.)</li>
          <li><strong>Timeline:</strong> Organizes events into frames based on frameId</li>
          <li><strong>Playback:</strong> Advances frames with play/pause/speed control</li>
          <li><strong>React Hook:</strong> Subscribes to frame updates, triggers re-renders</li>
          <li><strong>Component:</strong> Renders current frame with UI controls</li>
        </ol>
      </section>

      <section style={{ marginBottom: '3rem', border: '1px solid #e5e7eb', padding: '1.5rem', borderRadius: '8px', background: '#f9fafb' }}>
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

      <section style={{ marginBottom: '3rem', padding: '1.5rem', borderRadius: '8px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
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

      <section style={{ marginBottom: '3rem', padding: '1.5rem', borderRadius: '8px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
        <h2>Playback Controls</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { label: '▶ Play', onClick: engine.play, disabled: engine.playbackState === 'playing', bg: '#10b981' },
            { label: '⏸ Pause', onClick: engine.pause, disabled: engine.playbackState !== 'playing', bg: '#f59e0b' },
            { label: '← Prev', onClick: engine.previousFrame, disabled: !engine.canRewind(), bg: '#3b82f6' },
            { label: 'Next →', onClick: engine.nextFrame, disabled: !engine.canAdvance(), bg: '#3b82f6' },
            { label: '↻ Reset', onClick: engine.replay, disabled: false, bg: '#8b5cf6' }
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              disabled={btn.disabled}
              style={{
                padding: '0.6rem 1.2rem',
                background: btn.disabled ? '#d1d5db' : btn.bg,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: btn.disabled ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                fontSize: '0.95rem',
                transition: 'all 0.2s ease',
                opacity: btn.disabled ? 0.6 : 1,
                boxShadow: btn.disabled ? 'none' : '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => !btn.disabled && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)')}
              onMouseLeave={(e) => !btn.disabled && (e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)')}
            >
              {btn.label}
            </button>
          ))}

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

      <section style={{ marginBottom: '3rem', padding: '1.5rem', borderRadius: '8px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
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

      <section style={{ marginBottom: '3rem', padding: '1.5rem', borderRadius: '8px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
        <h2>Visualization</h2>
        <ArrayRenderer frame={engine.currentFrame} array={data} height={300} />

        <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ width: '20px', height: '20px', background: '#2563eb', borderRadius: '3px' }} />
            <span style={{ fontSize: '0.9rem' }}>Default</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ width: '20px', height: '20px', background: '#f97316', borderRadius: '3px' }} />
            <span style={{ fontSize: '0.9rem' }}>Being Compared</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ width: '20px', height: '20px', background: '#dc2626', borderRadius: '3px' }} />
            <span style={{ fontSize: '0.9rem' }}>Just Swapped</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ width: '20px', height: '20px', background: '#16a34a', borderRadius: '3px' }} />
            <span style={{ fontSize: '0.9rem' }}>Highlighted</span>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '3rem', padding: '1.5rem', borderRadius: '8px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
        <h2>Current Frame Events</h2>
        {engine.currentFrame ? (
          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
            <div><strong>Frame ID:</strong> {engine.currentFrame.frameId}</div>
            <div><strong>Events:</strong> {engine.currentFrame.events.length}</div>
            <div style={{ marginTop: '0.5rem', color: '#666', maxHeight: '200px', overflowY: 'auto' }}>
              {engine.currentFrame.events.map((e: any, i: number) => (
                <div key={i} style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>[{e.type}]</span> {e.explanation || JSON.stringify(e)}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>No frame</div>
        )}
      </section>

      <section style={{ marginBottom: '3rem', padding: '1.5rem', borderRadius: '8px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
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
      </div>
    </div>
  );
}
