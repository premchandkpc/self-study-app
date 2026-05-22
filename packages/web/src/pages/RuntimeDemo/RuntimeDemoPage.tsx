import { useState, useRef, useEffect, useCallback } from 'react'
import { RuntimeEngine, createEvent, Entity, Graph } from '../../runtime'
import { SemanticGraph, createSemanticNode, createSemanticEdge } from '../../semantic'
import { serializeTimeline, estimateCompressionRatio } from '../../protocols'

function generateSortEvents(arr: number[]): ReturnType<typeof createEvent>[] {
  const data = [...arr]
  const events: ReturnType<typeof createEvent>[] = []
  let frameId = 0

  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data.length - i - 1; j++) {
      events.push(createEvent('PROPERTY_CHANGED', ++frameId, {
        entityId: `elem_${j}`,
        property: 'highlight',
        newValue: 'comparing',
        explanation: `Comparing index ${j} (${data[j]}) and index ${j + 1} (${data[j + 1]})`,
      }))

      if (data[j] > data[j + 1]) {
        const tmp = data[j]
        data[j] = data[j + 1]
        data[j + 1] = tmp

        events.push(createEvent('PROPERTY_CHANGED', ++frameId, {
          entityId: `elem_${j}`,
          property: 'value',
          oldValue: data[j + 1],
          newValue: data[j],
          explanation: `Swap: ${data[j]} ↔ ${data[j + 1]}`,
        }))
        events.push(createEvent('PROPERTY_CHANGED', ++frameId, {
          entityId: `elem_${j + 1}`,
          property: 'value',
          oldValue: data[j],
          newValue: data[j + 1],
          explanation: `Swap: ${data[j]} ↔ ${data[j + 1]}`,
        }))
      }
    }
    events.push(createEvent('LABEL_ADDED', ++frameId, {
      entityId: `elem_${data.length - i - 1}`,
      property: 'sorted',
      newValue: true,
      explanation: `Element ${data[data.length - i - 1]} is now in sorted position`,
    }))
  }

  events.push(createEvent('CUSTOM', ++frameId, {
    explanation: 'Sorting complete!',
    importance: 10,
  }))

  return events
}

export default function RuntimeDemoPage() {
  const [engine] = useState(() => new RuntimeEngine(new Graph(), { frameDelay: 400 }))
  const [frameIndex, setFrameIndex] = useState(0)
  const [frameCount, setFrameCount] = useState(0)
  const [state, setState] = useState<'idle' | 'running' | 'paused' | 'completed' | 'error'>('idle')
  const [entities, setEntities] = useState<Entity[]>([])
  const [currentEvents, setCurrentEvents] = useState<any[]>([])
  const [speed, setSpeed] = useState(1)
  const [arraySize, setArraySize] = useState(6)
  const [semanticGraph] = useState(() => new SemanticGraph())
  const [eventBusStats, setEventBusStats] = useState<{ total: number; byType: Map<string, number> } | null>(null)
  const [compressionRatio, setCompressionRatio] = useState(0)
  const engineRef = useRef(engine)

  const initSort = useCallback((size: number) => {
    const eng = engineRef.current
    eng.reset()
    semanticGraph.getAllNodes().forEach(n => semanticGraph.removeNode(n.id))

    const initialData = Array.from({ length: size }, () => Math.floor(Math.random() * 100) + 1)

    for (let i = 0; i < initialData.length; i++) {
      const entity = new Entity(`elem_${i}`, 'node', 'array-element')
      entity.set('value', initialData[i])
      entity.set('index', i)
      entity.set('highlight', 'default')
      eng.getCurrentGraph().addEntity(entity)

      semanticGraph.addNode(createSemanticNode(
        `elem_${i}`, 'node', 'array-element', 'comparison', 'sorting',
        { importance: 0.6, keywords: ['element', 'array', 'sort'], interviewRelevant: true },
      ))
    }

    const sortEvents = generateSortEvents(initialData)
    eng.ingestBatch(sortEvents)
    eng.build()

    const ratio = estimateCompressionRatio(eng.getTimeline().getFrames())
    setCompressionRatio(Math.round(ratio * 10) / 10)
    setEventBusStats(eng.getEventBus().getStats())

    const count = eng.getFrameCount()
    setFrameCount(count)
    setFrameIndex(0)
    setState('idle')
    eng.seek(0)
    setEntities(eng.getCurrentGraph().getAllEntities())
    const frame = eng.getCurrentFrame()
    setCurrentEvents(frame?.events ?? [])
  }, [semanticGraph])

  useEffect(() => {
    initSort(arraySize)
  }, [])

  useEffect(() => {
    const eng = engineRef.current
    const unsubFrame = eng.onFrameChange((frame) => {
      setFrameIndex(eng.getCurrentFrameIndex())
      setEntities(eng.getCurrentGraph().getAllEntities())
      setCurrentEvents(frame.events)
    })
    const unsubState = eng.onStateChange((s) => {
      setState(s)
    })
    return () => {
      unsubFrame()
      unsubState()
    }
  }, [])

  const handlePlay = () => engine.play()
  const handlePause = () => engine.pause()
  const handleReset = () => {
    initSort(arraySize)
  }
  const handleStepForward = () => engine.stepForward()
  const handleStepBackward = () => engine.stepBackward()
  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value)
    engine.seek(idx)
  }
  const handleSpeedChange = (s: number) => {
    setSpeed(s)
    engine.setSpeed(s)
  }

  const sorted = [...entities].sort((a, b) => (a.get('index') as number) - (b.get('index') as number))
  const maxVal = Math.max(...sorted.map(e => (e.get('value') as number) || 0), 1)

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '2rem', border: '1px solid #334155' }}>
          <h1 style={{ margin: '0 0 0.25rem', color: '#38bdf8' }}>
            Phase 1+2: Runtime + Semantic Enrichment
          </h1>
          <p style={{ margin: '0 0 2rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            Entity · Graph · Event · EventBus · Scheduler · Timeline · RuntimeEngine · SemanticGraph · Middleware · Serialization
          </p>

          <section style={{ marginBottom: '2rem', padding: '1rem', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '1rem', margin: '0 0 0.75rem', color: '#94a3b8' }}>Controls</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={handlePlay} disabled={state === 'running'} style={{ padding: '0.5rem 1rem', background: state === 'running' ? '#334155' : '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: state === 'running' ? 'not-allowed' : 'pointer' }}>▶ Play</button>
              <button onClick={handlePause} disabled={state !== 'running'} style={{ padding: '0.5rem 1rem', background: state !== 'running' ? '#334155' : '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: state !== 'running' ? 'not-allowed' : 'pointer' }}>⏸ Pause</button>
              <button onClick={handleStepBackward} style={{ padding: '0.5rem 1rem', background: '#64748b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>← Step</button>
              <button onClick={handleStepForward} style={{ padding: '0.5rem 1rem', background: '#64748b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Step →</button>
              <button onClick={handleReset} style={{ padding: '0.5rem 1rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>↻ Reset</button>

              <div style={{ marginLeft: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Speed:</label>
                {[0.5, 1, 2, 4].map(s => (
                  <button key={s} onClick={() => handleSpeedChange(s)} style={{
                    padding: '0.3rem 0.6rem',
                    background: speed === s ? '#2563eb' : '#334155',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}>{s}x</button>
                ))}
              </div>

              <div style={{ marginLeft: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Size:</label>
                {[4, 6, 8, 10].map(s => (
                  <button key={s} onClick={() => { setArraySize(s); initSort(s) }} style={{
                    padding: '0.3rem 0.6rem',
                    background: arraySize === s ? '#2563eb' : '#334155',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}>{s}</button>
                ))}
              </div>
            </div>
          </section>

          <section style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Frame {frameIndex}/{Math.max(0, frameCount - 1)}</span>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>State: {state}</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, frameCount - 1)}
              value={frameIndex}
              onChange={handleSlider}
              style={{ width: '100%', accentColor: '#38bdf8' }}
            />
          </section>

          <section style={{ marginBottom: '2rem', padding: '1rem', background: '#0f172a', borderRadius: '8px', minHeight: '200px' }}>
            <h2 style={{ fontSize: '1rem', margin: '0 0 1rem', color: '#94a3b8' }}>
              Array Visualization ({sorted.length} elements)
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', height: '200px' }}>
              {sorted.map((entity, i) => {
                const val = entity.get('value') as number
                const highlight = entity.get('highlight') as string
                const sorted = entity.get('sorted') as boolean
                const heightPct = (val / maxVal) * 100

                let barColor = '#3b82f6'
                if (highlight === 'comparing') barColor = '#f97316'
                if (sorted) barColor = '#22c55e'

                return (
                  <div key={entity.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.75rem', marginBottom: '0.25rem', color: '#e2e8f0' }}>{val}</span>
                    <div style={{
                      width: '100%',
                      height: `${heightPct}%`,
                      background: barColor,
                      borderRadius: '4px 4px 0 0',
                      transition: 'all 0.15s ease',
                      minHeight: '4px',
                      opacity: sorted ? 0.8 : 1,
                    }} />
                    <span style={{ fontSize: '0.65rem', marginTop: '0.25rem', color: '#64748b' }}>{i}</span>
                  </div>
                )
              })}
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <section style={{ padding: '1rem', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
              <h2 style={{ fontSize: '1rem', margin: '0 0 0.75rem', color: '#94a3b8' }}>Entities ({entities.length})</h2>
              <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', maxHeight: '200px', overflowY: 'auto' }}>
                {sorted.map(e => (
                  <div key={e.id} style={{ marginBottom: '0.25rem', color: '#94a3b8' }}>
                    <span style={{ color: '#38bdf8' }}>{e.id}</span>
                    <span style={{ color: '#64748b' }}> [{e.kind}/{e.type}]</span>
                    {' '}val={JSON.stringify(e.get('value'))}
                    {' '}{e.get('sorted') ? '✓' : e.get('highlight') === 'comparing' ? '⟷' : ''}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: '1rem', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
              <h2 style={{ fontSize: '1rem', margin: '0 0 0.75rem', color: '#94a3b8' }}>
                Frame Events ({currentEvents.length})
              </h2>
              <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', maxHeight: '200px', overflowY: 'auto' }}>
                {currentEvents.map((evt, i) => (
                  <div key={i} style={{ marginBottom: '0.35rem', color: '#94a3b8' }}>
                    <span style={{ color: '#f59e0b' }}>[{evt.type}]</span>
                    {' '}{evt.explanation ?? `${evt.property}: ${JSON.stringify(evt.oldValue)} → ${JSON.stringify(evt.newValue)}`}
                    {evt.importance && evt.importance >= 10
                      ? <span style={{ color: '#22c55e', marginLeft: '0.5rem' }}>★</span>
                      : null}
                  </div>
                ))}
              </div>
            </section>

            <section style={{ padding: '1rem', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
              <h2 style={{ fontSize: '1rem', margin: '0 0 0.75rem', color: '#94a3b8' }}>
                Semantic Enrichment (Phase 2)
              </h2>
              <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', maxHeight: '200px', overflowY: 'auto' }}>
                {currentEvents.slice(0, 6).map((evt, i) => (
                  <div key={i} style={{ marginBottom: '0.5rem', padding: '0.3rem', background: '#1e293b', borderRadius: '4px' }}>
                    <div><span style={{ color: '#a78bfa' }}>concept:</span> {evt.concept ?? 'auto-detected'}</div>
                    <div><span style={{ color: '#a78bfa' }}>category:</span> {evt.category ?? '—'}</div>
                    <div><span style={{ color: '#a78bfa' }}>importance:</span> {evt.importance?.toFixed(2) ?? '—'}</div>
                  </div>
                ))}
                {currentEvents.length > 6 && <div style={{ color: '#64748b' }}>... +{currentEvents.length - 6} more</div>}
              </div>
            </section>
          </div>

          <section style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>EventBus Stats</span>
              <div style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
                {eventBusStats
                  ? Array.from(eventBusStats.byType.entries()).slice(0, 4).map(([t, c]) => (
                    <div key={t}><span style={{ color: '#38bdf8' }}>{t}</span>: {c}</div>
                  ))
                  : <span style={{ color: '#64748b' }}>—</span>
                }
              </div>
            </div>
            <div style={{ padding: '0.75rem', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Middlware Pipeline</span>
              <div style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
                <div><span style={{ color: '#22c55e' }}>✓</span> validateMiddleware</div>
                <div><span style={{ color: '#22c55e' }}>✓</span> enrichMiddleware</div>
                <div><span style={{ color: '#64748b' }}>Events auto-enriched with concept/category/importance</span></div>
              </div>
            </div>
            <div style={{ padding: '0.75rem', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Serialization</span>
              <div style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
                <div><span style={{ color: '#38bdf8' }}>Compression Ratio</span>: {compressionRatio}:1</div>
                <div><span style={{ color: '#64748b' }}>Total Events</span>: {eventBusStats?.total ?? 0}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
