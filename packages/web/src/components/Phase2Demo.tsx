import { useState, useMemo } from 'react';
import { useStudy2Playback } from '@/study2/hooks/useStudy2Playback';
import { bubbleSortEvents, quickSortEvents, mergeSortEvents, insertionSortEvents, heapSortEvents } from '@/study2/algorithms/sorting';
import { linearSearchEvents, binarySearchEvents } from '@/study2/algorithms/searching';
import { Frame, SemanticEvent } from '@/study2/runtime';

interface AlgoDef {
  id: string;
  name: string;
  fn: (...args: any[]) => SemanticEvent[];
  prepareData: () => { arr: number[]; target?: number };
  desc: string;
}

const ALGOS: AlgoDef[] = [
  { id: 'bubble', name: 'Bubble Sort', fn: bubbleSortEvents, prepareData: () => ({ arr: [64, 34, 25, 12, 22, 11, 90] }), desc: 'Adjacent swaps bubble largest to end — O(n²)' },
  { id: 'quick', name: 'Quick Sort', fn: quickSortEvents, prepareData: () => ({ arr: [64, 34, 25, 12, 22, 11, 90] }), desc: 'Partition around pivot, recurse — O(n log n)' },
  { id: 'merge', name: 'Merge Sort', fn: mergeSortEvents, prepareData: () => ({ arr: [64, 34, 25, 12, 22, 11, 90] }), desc: 'Split, sort each half, merge — O(n log n)' },
  { id: 'insertion', name: 'Insertion Sort', fn: insertionSortEvents, prepareData: () => ({ arr: [64, 34, 25, 12, 22, 11, 90] }), desc: 'Insert each element into sorted position — O(n²)' },
  { id: 'heap', name: 'Heap Sort', fn: heapSortEvents, prepareData: () => ({ arr: [64, 34, 25, 12, 22, 11, 90] }), desc: 'Build max heap, extract root — O(n log n)' },
  { id: 'linear', name: 'Linear Search', fn: (arr: number[], t = 22) => linearSearchEvents(arr, t), prepareData: () => ({ arr: [64, 34, 25, 12, 22, 11, 90], target: 22 }), desc: 'Check each element — O(n)' },
  { id: 'binary', name: 'Binary Search', fn: (arr: number[], t = 22) => binarySearchEvents(arr, t), prepareData: () => ({ arr: [11, 12, 22, 25, 34, 64, 90], target: 22 }), desc: 'Halve search space each step — O(log n)' },
];

function BarColor(index: number, frame: Frame | null): string {
  if (!frame) return '#2563eb';
  for (const e of frame.events) {
    if (e.type === 'ARRAY_SWAP' && e.indices?.includes(index)) return '#dc2626';
    if (e.type === 'ARRAY_WRITE' && e.indices?.[0] === index) return '#dc2626';
    if (e.type === 'ARRAY_COMPARE' && e.indices?.includes(index)) return '#f97316';
    if (e.type === 'PIVOT_SELECT' && e.indices?.[0] === index) return '#8b5cf6';
    if (e.type === 'SEARCH_FOUND' && e.indices?.[0] === index) return '#16a34a';
    if (e.type === 'SEARCH_CHECK' && e.indices?.[0] === index) return '#f97316';
    if (e.type === 'HIGHLIGHT_SET' && e.indices?.includes(index)) return '#16a34a';
  }
  return '#2563eb';
}

function BarChart({ frame, values }: { frame: Frame | null; values: number[] }) {
  const max = Math.max(...values);
  return (
    <div style={{ width: '100%', height: 280, display: 'flex', alignItems: 'flex-end', gap: 2, padding: '0.75rem', background: '#0f172a', borderRadius: 8, border: '1px solid #334155' }}>
      {values.map((v, i) => {
        const pct = (v / max) * 100;
        const color = BarColor(i, frame);
        return (
          <div key={i} style={{
            flex: 1, height: pct + '%', background: color,
            borderRadius: '4px 4px 0 0', display: 'flex',
            alignItems: 'flex-end', justifyContent: 'center',
            padding: '2px', color: 'white', fontSize: 10,
            fontWeight: 'bold', transition: 'all 0.15s ease',
            boxShadow: color !== '#2563eb' ? '0 0 8px rgba(56,189,248,0.3)' : 'none',
            transform: color === '#dc2626' ? 'scale(1.05)' : 'scale(1)',
          }}>
            {v}
          </div>
        );
      })}
    </div>
  );
}

export default function Phase2Demo() {
  const [algoId, setAlgoId] = useState('bubble');

  const algo = useMemo(() => ALGOS.find(a => a.id === algoId)!, [algoId]);
  const { arr, target } = useMemo(() => algo.prepareData(), [algo]);
  const events = useMemo(() => {
    try { return algo.fn(arr, target); }
    catch { return []; }
  }, [algo, arr, target]);

  const { currentFrame, currentValues, frameIndex, frameCount, playState, speed, progress, play, pause, nextFrame, previousFrame, setSpeed, reset } = useStudy2Playback(arr, events);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h1 style={{ color: '#38bdf8', margin: 0, fontSize: '1.4rem' }}>Runtime Engine • Phase 2</h1>
            <select value={algoId} onChange={(e) => setAlgoId(e.target.value)} style={{ padding: '0.4rem 0.75rem', background: '#0f172a', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 6, fontSize: '0.85rem' }}>
              {ALGOS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <BarChart frame={currentFrame} values={currentValues} />

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Btn label={playState === 'playing' ? '⏸ Pause' : '▶ Play'} onClick={playState === 'playing' ? pause : play} color="#10b981" />
            <Btn label="← Prev" onClick={previousFrame} color="#3b82f6" />
            <Btn label="Next →" onClick={nextFrame} color="#3b82f6" />
            <Btn label="↻ Reset" onClick={reset} color="#8b5cf6" />
            <div style={{ marginLeft: 'auto', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              Speed:
              <select value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} style={{ padding: '0.3rem 0.5rem', background: '#0f172a', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 4 }}>
                <option value="0.5">0.5x</option>
                <option value="1">1x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
            <div>Events: <strong style={{ color: '#38bdf8' }}>{events.length}</strong></div>
            <div>Frames: <strong style={{ color: '#38bdf8' }}>{frameCount}</strong></div>
            <div>Frame: <strong style={{ color: '#38bdf8' }}>{frameIndex}/{frameCount}</strong></div>
            <div>Progress: <strong style={{ color: '#38bdf8' }}>{progress}%</strong></div>
            <div>Speed: <strong style={{ color: '#38bdf8' }}>{speed}x</strong></div>
          </div>

          <div style={{ marginTop: '0.5rem', width: '100%', height: 4, background: '#334155', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#38bdf8', width: progress + '%', transition: 'width 0.15s' }} />
          </div>

          <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: 6, background: '#0f172a', border: '1px solid #334155' }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '0.4rem' }}>EVENT LOG</div>
            {currentFrame ? (
              <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', maxHeight: 100, overflowY: 'auto', color: '#94a3b8' }}>
                {currentFrame.events.map((e, i) => (
                  <div key={i} style={{ marginBottom: '0.15rem' }}>
                    <span style={{ color: '#38bdf8' }}>[{e.type}]</span>
                    <span style={{ color: '#64748b' }}> #{e.frameId}</span>
                    {e.explanation ? <span> {e.explanation}</span> : null}
                    {e.complexity ? <span style={{ color: '#f59e0b' }}> ({e.complexity})</span> : null}
                  </div>
                ))}
              </div>
            ) : <div style={{ color: '#475569', fontSize: '0.8rem' }}>No frame</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Btn({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} style={{
      padding: '0.4rem 0.9rem', background: color, color: 'white',
      border: 'none', borderRadius: 5, cursor: 'pointer',
      fontWeight: 500, fontSize: '0.8rem',
    }}>
      {label}
    </button>
  );
}
