import { useState, useRef, useEffect, useCallback } from 'react'
import { Universe, Connection, R2Object } from '../../runtime2/core'
import { CompilerPipeline, Token, VariableObj, IRInst } from '../../runtime2/compiler'
import { UniverseRenderer } from '../../runtime2/renderer'
import {
  Int, Str, Bool, ArrayObj, MatrixObj,
  LinkedListObj, StackObj, QueueObj, TreeObj, GraphObj,
  JVMArch, CPUArch, MemoryArch, ThreadObj,
  Server, Database, LoadBalancer, Queue, Cache, Worker, MicroserviceSystem,
  Box, Circle, Diamond, Boundary, Label, Group,
} from '../../runtime2/objects'

type Mode = 'dsa' | 'system' | 'architecture' | 'sandbox'
type PipelineView = 'tokens' | 'ast' | 'ir' | 'vars'

const DSA_EXAMPLES: Record<string, string> = {
  'Two Sum': `// Two Sum
let nums = [2, 7, 11, 15]; let target = 9
for (let i = 0; i < nums.length; i++) {
  for (let j = i + 1; j < nums.length; j++) {
    if (nums[i] + nums[j] === target) return [i, j]
  }
}`,
  'Bubble Sort': `// Bubble Sort
let arr = [64, 34, 25, 12, 22, 11, 90]
for (let i = 0; i < arr.length; i++) {
  for (let j = 0; j < arr.length - i - 1; j++) {
    if (arr[j] > arr[j + 1]) {
      let tmp = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = tmp
    }
  }
}`,
  'Binary Search': `// Binary Search
let arr = [1, 3, 5, 7, 9, 11, 13, 15]; let target = 7
let lo = 0, hi = arr.length - 1
while (lo <= hi) {
  let mid = Math.floor((lo + hi) / 2)
  if (arr[mid] === target) break
  else if (arr[mid] < target) lo = mid + 1
  else hi = mid - 1
}`,
  'BFS Graph': `// BFS Graph Traversal
let graph = { A: ['B','C'], B: ['A','D','E'], C: ['A','F'], D: ['B'], E: ['B','F'], F: ['C','E'] }
let visited = new Set(); let queue = ['A']
while (queue.length > 0) {
  let node = queue.shift()
  if (!visited.has(node)) {
    visited.add(node)
    for (let n of graph[node]) { if (!visited.has(n)) queue.push(n) }
  }
}`,
  'Inorder Tree': `// Inorder Tree Traversal
let tree = [1, 2, 3, 4, 5, 6, 7]
function inorder(idx) {
  if (idx >= tree.length) return
  inorder(idx * 2 + 1)
  console.log(tree[idx])
  inorder(idx * 2 + 2)
}
inorder(0)`,
}

const SHADOW = { button: '0 2px 8px rgba(0,0,0,0.3)' }

export default function Runtime2Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef(new UniverseRenderer())
  const pipelineRef = useRef(new CompilerPipeline())
  const universeRef = useRef<Universe>(new Universe())
  const [mode, setMode] = useState<Mode>('dsa')
  const [code, setCode] = useState(DSA_EXAMPLES['Two Sum'])
  const [stepIndex, setStepIndex] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [result, setResult] = useState('')
  const [pipelineView, setPipelineView] = useState<PipelineView>('vars')
  const [darkMode, setDarkMode] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showConnections, setShowConnections] = useState(true)
  const [variables, setVariables] = useState<{ name: string; value: unknown; scope: string; isTemp: boolean; step: number }[]>([])
  const [activeStepVars, setActiveStepVars] = useState<string[]>([])
  const [tokens, setTokens] = useState<Token[]>([])
  const [ir, setIr] = useState<IRInst[]>([])
  const [objectCount, setObjectCount] = useState(0)
  const [connectionCount, setConnectionCount] = useState(0)
  const [zoomPct, setZoomPct] = useState(100)

  // Sync zoom from renderer on each frame via polling
  useEffect(() => {
    const iv = setInterval(() => {
      setZoomPct(Math.round(rendererRef.current.viewport.scale * 100))
    }, 200)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const r = rendererRef.current
    if (canvasRef.current) {
      const resize = () => {
        const canvas = canvasRef.current!
        const dpr = window.devicePixelRatio || 1
        canvas.width = canvas.clientWidth * dpr
        canvas.height = canvas.clientHeight * dpr
        r.attach(canvas)
      }
      window.addEventListener('resize', resize)
      resize()
      r.startAutoRender(() => universeRef.current)
      return () => { r.stopAutoRender(); window.removeEventListener('resize', resize) }
    }
  }, [])

  useEffect(() => {
    const r = rendererRef.current
    r.darkMode = darkMode; r.showGrid = showGrid; r.showLabels = showLabels; r.showConnections = showConnections
  }, [darkMode, showGrid, showLabels, showConnections])

  const compileAndRun = useCallback(() => {
    const p = pipelineRef.current
    const inputs = { arr: [64, 34, 25, 12, 22, 11, 90], nums: [2, 7, 11, 15], target: [9] }
    const exec = p.run(code, inputs)
    universeRef.current = exec.universe
    setResult(exec.result)
    setTokens(exec.tokens)
    setIr(exec.ir)
    setTotalSteps(exec.steps.length)
    setStepIndex(0)
    setObjectCount(exec.universe.size)
    setConnectionCount(exec.universe.connectionCount)

    // Flatten step-variable mapping
    const allVars = exec.steps.flatMap((s, si) =>
      Object.entries({ ...s.vars, ...s.tempVars }).map(([k, v]) => ({
        name: k, value: v,
        scope: s.label,
        isTemp: k in s.tempVars,
        step: si,
      }))
    )
    setVariables(allVars)
    setActiveStepVars(Object.keys(exec.steps[0]?.vars || {}))
  }, [code])

  const handleStepChange = useCallback((newStep: number) => {
    setStepIndex(newStep)
    const p = pipelineRef.current
    if (p.steps[newStep]) {
      setActiveStepVars([...Object.keys(p.steps[newStep].vars), ...Object.keys(p.steps[newStep].tempVars)])
      // Update variable toggles in universe based on active step
      const activeSet = new Set(activeStepVars)
      universeRef.current.objects.forEach(obj => {
        const name = obj.get('name') as string | undefined
        if (name && activeSet.has(name)) {
          if (p.steps[newStep].vars[name] !== undefined) obj.set('value', p.steps[newStep].vars[name])
          if (p.steps[newStep].tempVars[name] !== undefined) obj.set('value', p.steps[newStep].tempVars[name])
        }
      })
    }
  }, [activeStepVars])

  const buildArchitecture = useCallback((type: string) => {
    const u = new Universe()
    let root: R2Object
    switch (type) {
      case 'jvm': root = JVMArch(); break
      case 'cpu': root = CPUArch(); break
      case 'memory': root = MemoryArch(); break
      default: root = JVMArch(); break
    }
    u.add(root)
    // Add connections between major components
    if (type === 'jvm') {
      const children = root.children
      for (let i = 0; i < children.length - 1; i++) {
        u.connect(children[i], children[i + 1]).color_('#ef4444').curve(0.1)
      }
    }
    universeRef.current = u
    setResult(`Architecture: ${type}`)
    setObjectCount(u.size); setConnectionCount(u.connectionCount)
    setTokens([]); setIr([]); setVariables([]); setTotalSteps(0); setStepIndex(0)
  }, [])

  const buildSystemDesign = useCallback((type: string) => {
    const u = new Universe()
    let root: R2Object
    switch (type) {
      case 'microservices': root = MicroserviceSystem(); break
      default: {
        root = new R2Object('system-arch', 'system', { color: '#1e293b', w: 600, h: 400 }).label('Web Architecture').pos(30, 30)
        const lb = LoadBalancer('NLB').pos(230, 10)
        const s1 = Server('web-1').pos(60, 120); const s2 = Server('web-2').pos(180, 120); const s3 = Server('web-3').pos(300, 120)
        const db = Database('pg-primary', 'postgres').pos(420, 120)
        const cache = Cache('Redis').pos(80, 250); const queue = Queue('Kafka').pos(200, 250); const worker = Worker('worker-1').pos(340, 250)
        root.addChild(lb).addChild(s1).addChild(s2).addChild(s3).addChild(db).addChild(cache).addChild(queue).addChild(worker)
        // Visual flow connections
        u.connect(lb, s1, 'route').color_('#8b5cf6'); u.connect(lb, s2, 'route').color_('#8b5cf6'); u.connect(lb, s3, 'route').color_('#8b5cf6')
        u.connect(s1, db, 'reads/writes').color_('#f59e0b'); u.connect(s2, db, 'reads/writes').color_('#f59e0b'); u.connect(s3, db, 'reads/writes').color_('#f59e0b')
        u.connect(s1, cache, 'cache').color_('#14b8a6'); u.connect(s2, cache, 'cache').color_('#14b8a6')
        u.connect(queue, worker, 'process').color_('#ec4899')
        break
      }
    }
    u.add(root)
    universeRef.current = u
    setResult(`System: ${type}`); setObjectCount(u.size); setConnectionCount(u.connectionCount)
    setTokens([]); setIr([]); setVariables([]); setTotalSteps(0); setStepIndex(0)
  }, [])

  const buildSandbox = useCallback((type: string) => {
    const u = new Universe()
    switch (type) {
      case 'datastructures': {
        const arr = ArrayObj([5, 3, 8, 1, 9, 2], 'arr').pos(30, 20)
        const ll = LinkedListObj([10, 20, 30, 40], 'list', { universe: u }).pos(30, 100)
        const stack = StackObj([1, 2, 3], 'stack').pos(30, 180)
        const queue = QueueObj([4, 5, 6], 'queue').pos(30, 260)
        const tree = TreeObj([1, 2, 3, 4, 5, 6, 7], 'tree', { universe: u }).pos(250, 20)
        const graph = GraphObj(
          [{ id: 'a', label: 'A', val: 1, x: 0, y: 0 }, { id: 'b', label: 'B', val: 2, x: 80, y: 0 }, { id: 'c', label: 'C', val: 3, x: 40, y: 60 }],
          [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'a' }],
          'graph', { universe: u }
        ).pos(250, 180)
        u.add(arr).add(ll).add(stack).add(queue).add(tree).add(graph)
        break
      }
      case 'visual': {
        const b1 = Box(80, 50, '#3b82f6', 'Box').pos(20, 20)
        const c1 = Circle(25, '#ef4444', 'Circle').pos(140, 20)
        const d1 = Diamond(60, 50, '#8b5cf6', 'Diamond').pos(240, 10)
        const bd = Boundary(200, 100, '#22c55e', 'Boundary').pos(20, 100)
        const l1 = Label('Hello Universe', '#f59e0b').pos(40, 120)
        u.add(b1).add(c1).add(d1).add(bd).add(l1)
        break
      }
      case 'matrix': {
        const m = MatrixObj([[1, 2, 3], [4, 5, 6], [7, 8, 9]], 'matrix').pos(30, 20)
        u.add(m)
        break
      }
    }
    universeRef.current = u
    setResult(`Sandbox: ${type}`); setObjectCount(u.size); setConnectionCount(u.connectionCount)
    setTokens([]); setIr([]); setVariables([]); setTotalSteps(0); setStepIndex(0)
  }, [])

  const resetView = useCallback(() => {
    const r = rendererRef.current
    r.viewport.x = 0; r.viewport.y = 0; r.viewport.scale = 1
  }, [])

  const isCurrentStepVar = (name: string) => activeStepVars.includes(name)

  const navbar = {
    container: { minHeight: '100vh', background: darkMode ? '#0f172a' : '#f8fafc', color: darkMode ? '#e2e8f0' : '#1e293b', fontFamily: 'system-ui, sans-serif' },
    header: { background: darkMode ? '#1e293b' : '#ffffff', borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' as const, boxShadow: SHADOW.button },
    headerTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '-0.02em' as const },
    headerBadge: { fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px', background: '#1e293b', color: '#64748b', border: '1px solid #334155', marginLeft: '8px' },
    modeBar: { display: 'flex', gap: '4px', background: darkMode ? '#0f172a' : '#f1f5f9', padding: '4px', borderRadius: '8px' },
    modeBtn: (active: boolean) => ({ padding: '6px 14px', borderRadius: '6px', border: 'none', background: active ? '#2563eb' : 'transparent', color: active ? 'white' : darkMode ? '#94a3b8' : '#64748b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: active ? 600 : 400, transition: 'all 0.15s' }),
    main: { display: 'flex', height: 'calc(100vh - 53px)' },
    leftPanel: { width: '40%', minWidth: '380px', display: 'flex', flexDirection: 'column' as const, borderRight: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` },
    rightPanel: { flex: 1, position: 'relative' as const, overflow: 'hidden' as const },
    editor: { flex: 1, display: 'flex', flexDirection: 'column' as const, minHeight: '200px' },
    editorHeader: { padding: '8px 12px', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', background: darkMode ? '#1e293b' : '#f1f5f9', borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` },
    textarea: { flex: 1, width: '100%', padding: '12px', background: darkMode ? '#0f172a' : '#ffffff', color: darkMode ? '#e2e8f0' : '#1e293b', border: 'none', outline: 'none', fontFamily: "'Fira Code', 'JetBrains Mono', monospace", fontSize: '13px', lineHeight: '1.5', resize: 'none' as const, tabSize: 2 },
    examples: { display: 'flex', gap: '4px', padding: '6px 8px', flexWrap: 'wrap' as const, background: darkMode ? '#0f172a' : '#f8fafc', borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` },
    exampleBtn: (active: boolean) => ({ padding: '3px 10px', borderRadius: '4px', border: `1px solid ${active ? '#2563eb' : darkMode ? '#334155' : '#e2e8f0'}`, background: active ? '#1e3a5f' : 'transparent', color: active ? '#60a5fa' : darkMode ? '#94a3b8' : '#64748b', cursor: 'pointer', fontSize: '0.7rem', whiteSpace: 'nowrap' as const }),
    pipeline: { display: 'flex', flexDirection: 'column' as const, borderTop: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` },
    pipelineTabs: { display: 'flex', gap: '0', background: darkMode ? '#1e293b' : '#f1f5f9' },
    pipelineTab: (active: boolean) => ({ padding: '6px 14px', border: 'none', background: active ? (darkMode ? '#0f172a' : '#ffffff') : 'transparent', color: active ? '#38bdf8' : '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: active ? 600 : 400, borderBottom: active ? '2px solid #38bdf8' : '2px solid transparent' }),
    pipelineContent: { flex: 1, overflow: 'auto' as const, padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.75rem' },
    canvas: { width: '100%', height: '100%', display: 'block' as const, cursor: 'grab' as const },
    toolbar: { position: 'absolute' as const, bottom: '12px', right: '12px', display: 'flex', gap: '6px', zIndex: 10 },
    toolbarBtn: { padding: '6px 10px', borderRadius: '6px', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, background: darkMode ? '#1e293b' : '#ffffff', color: darkMode ? '#e2e8f0' : '#1e293b', cursor: 'pointer', fontSize: '0.7rem', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
    infoBar: { position: 'absolute' as const, top: '8px', left: '8px', zIndex: 10, display: 'flex', gap: '8px' },
    infoChip: { padding: '3px 8px', borderRadius: '4px', background: darkMode ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, fontSize: '0.65rem', color: '#94a3b8', backdropFilter: 'blur(4px)' },
    stepBar: { padding: '6px 12px', background: darkMode ? '#0f172a' : '#f8fafc', borderTop: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', gap: '8px' },
    stepSlider: { flex: 1, accentColor: '#38bdf8' as const, height: '4px' },
    resultBar: { padding: '8px 12px', background: darkMode ? '#1e293b' : '#f1f5f9', borderTop: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, fontSize: '0.8rem', color: '#22c55e', fontFamily: 'monospace' },
    btn: { padding: '6px 16px', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 },
    varRow: (active: boolean) => ({ padding: '3px 6px', borderBottom: `1px solid ${darkMode ? '#1e293b' : '#f1f5f9'}`, fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' as const, background: active ? (darkMode ? '#1e3a5f' : '#dbeafe') : 'transparent', borderRadius: '4px' }),
    varName: { color: '#60a5fa' },
    varVal: { color: '#f59e0b', maxWidth: '150px', overflow: 'hidden' as const, textOverflow: 'ellipsis' as const },
    varScope: { color: '#64748b', fontSize: '0.65rem' },
    tokenTag: { display: 'inline-block', padding: '1px 5px', margin: '1px', borderRadius: '3px', fontSize: '0.65rem', background: darkMode ? '#1e293b' : '#f1f5f9', color: '#94a3b8', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}` },
    irRow: { padding: '2px 0', fontFamily: 'monospace', fontSize: '0.7rem', color: '#06b6d4' },
  }

  return (
    <div style={navbar.container}>
      <div style={navbar.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={navbar.headerTitle}>runtime2</span>
          <span style={navbar.headerBadge}>everything is an object</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={navbar.modeBar}>
            {(['dsa', 'system', 'architecture', 'sandbox'] as Mode[]).map(m => (
              <button key={m} style={navbar.modeBtn(mode === m)} onClick={() => setMode(m)}>
                {m === 'dsa' ? 'DSA' : m === 'system' ? 'System' : m === 'architecture' ? 'Arch' : 'Sandbox'}
              </button>
            ))}
          </div>
          {mode === 'dsa' && <button style={navbar.btn} onClick={compileAndRun}>⚡ Run</button>}
        </div>
      </div>

      <div style={navbar.main}>
        {/* Left Panel */}
        <div style={navbar.leftPanel}>
          <div style={navbar.editor}>
            <div style={navbar.editorHeader}>
              {mode === 'dsa' ? 'Code Editor' : mode === 'system' ? 'System Design' : mode === 'architecture' ? 'Architecture' : 'Sandbox'}
              <span style={{ float: 'right', color: '#64748b', fontSize: '0.65rem' }}>
                {objectCount} objects · {connectionCount} connections
              </span>
            </div>
            {mode === 'dsa' && (
              <>
                <div style={navbar.examples}>
                  {Object.keys(DSA_EXAMPLES).map(k => (
                    <button key={k} style={navbar.exampleBtn(code === DSA_EXAMPLES[k])} onClick={() => setCode(DSA_EXAMPLES[k])}>{k}</button>
                  ))}
                </div>
                <textarea style={navbar.textarea} value={code} onChange={e => setCode(e.target.value)} spellCheck={false} />
              </>
            )}
            {mode === 'system' && (
              <div style={{ padding: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Web App', 'Microservices'].map(k => (
                  <button key={k} style={{ ...navbar.btn, background: '#8b5cf6' }} onClick={() => buildSystemDesign(k.toLowerCase())}>{k}</button>
                ))}
              </div>
            )}
            {mode === 'architecture' && (
              <div style={{ padding: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['JVM', 'CPU', 'Memory'].map(k => (
                  <button key={k} style={{ ...navbar.btn, background: '#ef4444' }} onClick={() => buildArchitecture(k.toLowerCase())}>{k}</button>
                ))}
              </div>
            )}
            {mode === 'sandbox' && (
              <div style={{ padding: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Data Structures', 'Visual Elements', 'Matrix'].map(k => (
                  <button key={k} style={{ ...navbar.btn, background: '#10b981' }} onClick={() => buildSandbox(k.toLowerCase().replace(' ', ''))}>{k}</button>
                ))}
              </div>
            )}
          </div>

          {/* Step slider for DSA mode */}
          {mode === 'dsa' && totalSteps > 0 && (
            <div style={navbar.stepBar}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', minWidth: '40px' }}>Step {stepIndex}</span>
              <input
                style={navbar.stepSlider}
                type="range" min={0} max={Math.max(0, totalSteps - 1)}
                value={stepIndex} onChange={e => handleStepChange(parseInt(e.target.value))}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b', minWidth: '40px', textAlign: 'right' }}>{totalSteps}</span>
            </div>
          )}

          {/* Pipeline View */}
          <div style={{ ...navbar.pipeline, height: mode === 'dsa' ? '42%' : '35%' }}>
            <div style={navbar.pipelineTabs}>
              {(['vars', 'tokens', 'ir'] as PipelineView[]).map(v => (
                <button key={v} style={navbar.pipelineTab(pipelineView === v)} onClick={() => setPipelineView(v)}>
                  {v === 'vars' ? 'Variables' : v === 'ir' ? 'IR' : 'Tokens'}
                </button>
              ))}
            </div>
            <div style={navbar.pipelineContent}>
              {pipelineView === 'vars' && (
                <div>
                  {variables.length === 0 && <div style={{ color: '#64748b' }}>Run code to see variables</div>}
                  {variables.filter(v => v.step === stepIndex).map((v, i) => (
                    <div key={i} style={navbar.varRow(isCurrentStepVar(v.name))}>
                      <span><span style={navbar.varName}>{v.name}</span> <span style={navbar.varScope}>{v.scope}</span></span>
                      <span style={navbar.varVal}>{JSON.stringify(v.value)}</span>
                    </div>
                  ))}
                </div>
              )}
              {pipelineView === 'tokens' && (
                <div>{tokens.slice(0, 80).map((t, i) => <span key={i} style={navbar.tokenTag}>{t.lexeme}</span>)}</div>
              )}
              {pipelineView === 'ir' && (
                <div>{ir.map((inst, i) => <div key={i} style={navbar.irRow}>{inst.label}</div>)}</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Canvas */}
        <div style={navbar.rightPanel}>
          <div style={navbar.infoBar}>
            <span style={navbar.infoChip}>{objectCount} objects</span>
            <span style={navbar.infoChip}>{connectionCount} connections</span>
            <span style={navbar.infoChip}>{zoomPct}%</span>
          </div>

          <canvas ref={canvasRef} style={navbar.canvas} />

          <div style={navbar.toolbar}>
            <button style={navbar.toolbarBtn} onClick={() => { setShowGrid(v => !v); rendererRef.current.showGrid = !rendererRef.current.showGrid }}>
              {showGrid ? 'Grid' : 'No Grid'}
            </button>
            <button style={navbar.toolbarBtn} onClick={() => { setShowLabels(v => !v); rendererRef.current.showLabels = !rendererRef.current.showLabels }}>
              {showLabels ? 'Labels' : 'No Labels'}
            </button>
            <button style={navbar.toolbarBtn} onClick={() => { setShowConnections(v => !v); rendererRef.current.showConnections = !rendererRef.current.showConnections }}>
              {showConnections ? 'Lines' : 'No Lines'}
            </button>
            <button style={navbar.toolbarBtn} onClick={() => { setDarkMode(v => !v); rendererRef.current.darkMode = !rendererRef.current.darkMode }}>
              {darkMode ? 'Dark' : 'Light'}
            </button>
            <button style={navbar.toolbarBtn} onClick={resetView}>Reset</button>
          </div>

          {result && <div style={navbar.resultBar}>Result: {result}</div>}
        </div>
      </div>
    </div>
  )
}
