import styles from './DSATemplate.module.css';

/**
 * Auto-detects what the step contains and renders the right data structure.
 * No props needed beyond viz (the current step snapshot).
 */
export default function DynamicViz({ viz }) {
  if (!viz) return null;

  // Explicit type hint wins
  const type = viz.type || detectType(viz);

  let structure = null;
  switch (type) {
    case 'array':      structure = <ArrayViz viz={viz} />;      break;
    case 'sort':       structure = <SortViz viz={viz} />;       break;
    case 'linkedlist': structure = <LinkedListViz viz={viz} />; break;
    case 'tree':       structure = <TreeViz viz={viz} />;       break;
    case 'graph':      structure = <GraphViz viz={viz} />;      break;
    case 'matrix':     structure = <MatrixViz viz={viz} />;     break;
    case 'hashmap':    structure = <HashMapViz viz={viz} />;    break;
    case 'dp':         structure = <DPViz viz={viz} />;         break;
    case 'string':     structure = <StringViz viz={viz} />;     break;
    case 'set':        structure = <SetViz viz={viz} />;        break;
    default: break;
  }

  const vars = viz.vars && Object.keys(viz.vars).length > 0 ? viz.vars : null;

  return (
    <div className={styles.dynWrap}>
      {structure}
      {vars && <VarsSection vars={vars} result={viz.result} />}
    </div>
  );
}

// ─── Live variable state ──────────────────────────────────────────────────────

function VarsSection({ vars, result }) {
  const entries = Object.entries(vars);
  if (!entries.length) return null;
  return (
    <div className={styles.varsSection}>
      <span className={styles.varsSectionLabel}>variables</span>
      <div className={styles.varsRow}>
        {entries.map(([k, v]) => (
          <VarChip key={k} name={k} value={v} />
        ))}
        {result !== undefined && result !== null && (
          <VarChip name="result" value={result} highlight />
        )}
      </div>
    </div>
  );
}

function VarChip({ name, value, highlight }) {
  const display = formatVarValue(value);
  return (
    <div className={`${styles.varChip} ${highlight ? styles.varChipResult : ''}`}>
      <span className={styles.varChipName}>{name}</span>
      <span className={styles.varChipVal}>{display}</span>
    </div>
  );
}

function formatVarValue(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v.length > 12 ? `"${v.slice(0, 10)}…"` : `"${v}"`;
  if (Array.isArray(v)) {
    const inner = v.slice(0, 6).map((x) => (x === null ? '∅' : String(x))).join(', ');
    return `[${inner}${v.length > 6 ? ', …' : ''}]`;
  }
  if (typeof v === 'object') {
    const entries = Object.entries(v).slice(0, 4);
    if (!entries.length) return '{}';
    return `{${entries.map(([k, val]) => `${k}:${val}`).join(', ')}${Object.keys(v).length > 4 ? ',…' : ''}}`;
  }
  return String(v);
}

function detectType(viz) {
  if (viz.cells)                               return 'array';
  if (viz.arr && viz.arr[0]?.state !== undefined) return 'sort';
  // linkedlist: reverse (nodes+origNext), cycle (nodes+cycleTarget), merge (list1)
  if (viz.nodes && Array.isArray(viz.nodes))   return 'linkedlist';
  if (viz.list1 !== undefined)                 return 'linkedlist';
  if (viz.tree)                                return 'tree';
  if (viz.nodeStates)                          return 'graph';
  if (viz.matrix)                              return 'matrix';
  if (viz.buckets)                             return 'hashmap';
  if (viz.dp || viz.table)                     return 'dp';
  if (viz.chars || viz.str !== undefined || viz.text)  return 'string';
  if (viz.setA || viz.arr1 || (viz.nums && viz.k !== undefined)) return 'set';
  return null;
}

// ─── Colour maps ────────────────────────────────────────────────────────────

const CELL_COLOR = {
  idle:       'var(--node-default)',
  active:     'var(--node-active)',
  window:     'var(--node-comparing)',
  left:       'var(--node-active)',
  right:      'var(--pod-crash)',
  found:      'var(--node-visited)',
  visited:    'var(--text-muted)',
  removing:   'var(--pod-crash)',
  adding:     'var(--node-active)',
  done:       'var(--node-done)',
  comparing:  'var(--node-comparing)',
  sorted:     'var(--pod-running)',
  pivot:      'var(--kafka-producer)',
};

const NODE_COLOR = {
  default:   'var(--node-default)',
  active:    'var(--node-active)',
  visited:   'var(--node-visited)',
  comparing: 'var(--node-comparing)',
  done:      'var(--node-done)',
  curr:      'var(--node-active)',
  prev:      'var(--node-comparing)',
  next:      'var(--kafka-producer)',
  idle:      'var(--node-default)',
  // cycle detect
  slow:      'var(--node-comparing)',
  fast:      'var(--pod-crash)',
  meet:      'var(--node-visited)',
};

// ─── Array cells ─────────────────────────────────────────────────────────────

function ArrayViz({ viz }) {
  const { cells = [], pointers = {}, window: win } = viz;
  const maxVal = Math.max(...cells.map((c) => Number(c.value ?? c.val ?? 0)), 1);

  return (
    <div className={styles.arrayWrap}>
      {cells.map((cell, i) => {
        const val   = cell.value ?? cell.val;
        const color = CELL_COLOR[cell.state] || CELL_COLOR.idle;
        const inWin = win && i >= win.left && i <= win.right;

        const ptrs = [];
        Object.entries(pointers).forEach(([k, v]) => { if (v === i) ptrs.push(k); });

        return (
          <div key={i} className={`${styles.cell} ${inWin ? styles.inWin : ''}`} style={{ '--cc': color }}>
            <div className={styles.cellVal}>{val}</div>
            <div className={styles.cellIdx}>{i}</div>
            {ptrs.length > 0 && <div className={styles.ptr}>{ptrs.join('/')}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Sort bars ───────────────────────────────────────────────────────────────

function SortViz({ viz }) {
  const { arr = [] } = viz;
  const maxVal = Math.max(...arr.map((b) => b.val), 1);

  return (
    <div className={styles.sortWrap}>
      {arr.map((bar, i) => (
        <div key={i} className={styles.barCol}>
          <div
            className={styles.bar}
            style={{
              height: `${(bar.val / maxVal) * 100}%`,
              background: CELL_COLOR[bar.state] || CELL_COLOR.idle,
            }}
          />
          <div className={styles.barVal}>{bar.val}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Linked list ──────────────────────────────────────────────────────────────

// State → pointer label for debug display
const LL_PTR_LABEL = {
  prev: 'prev', curr: 'curr', next: 'next',
  slow: 'slow', fast: 'fast', meet: 'slow=fast',
  active: '●', done: '✓',
};

function LLNode({ n }) {
  const color = NODE_COLOR[n.state] || NODE_COLOR.idle;
  const lbl   = LL_PTR_LABEL[n.state];
  return (
    <div className={styles.llNode} style={{ '--nc': color }}>
      <div className={styles.llVal}>{n.val}</div>
      {lbl && <div className={styles.llPtr}>{lbl}</div>}
    </div>
  );
}

function LLRow({ nodes, label, cycleTarget = -1 }) {
  const isCyclic = cycleTarget >= 0;
  return (
    <div className={styles.llSection}>
      {label && <span className={styles.llSectionLbl}>{label}</span>}
      <div className={styles.llWrap}>
        {nodes.map((n, i) => {
          const isLast = i === nodes.length - 1;
          return (
            <div key={n.id ?? i} className={styles.llItem}>
              <LLNode n={n} />
              {isLast
                ? isCyclic
                  ? <span className={styles.llCycleArrow}>↩ [{cycleTarget}]</span>
                  : <span className={styles.llNull}>→ ∅</span>
                : <span className={styles.llArrow}>→</span>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LinkedListViz({ viz }) {
  // ── Merge sorted: list1 + list2 + mergedNodes ──
  if (viz.list1 !== undefined) {
    const list1  = viz.list1  || [];
    const list2  = viz.list2  || [];
    const merged = viz.mergedNodes || [];
    return (
      <div className={styles.llMultiWrap}>
        <LLRow nodes={list1}  label="L1" />
        <LLRow nodes={list2}  label="L2" />
        {merged.length > 0 && <LLRow nodes={merged} label="Merged" />}
      </div>
    );
  }

  // ── Single list: reverse (origNext) or cycle (cycleTarget) ──
  const nodes      = viz.nodes || [];
  const cycleTarget = viz.cycleTarget ?? -1;

  return (
    <div className={styles.llMultiWrap}>
      <LLRow nodes={nodes} cycleTarget={cycleTarget} />
    </div>
  );
}

// ─── BST ─────────────────────────────────────────────────────────────────────

function TreeViz({ viz }) {
  const { tree, visited = [] } = viz;

  function renderNode(node, depth = 0) {
    if (!node) return null;
    const color = NODE_COLOR[node.state] || NODE_COLOR.default;

    return (
      <div key={node.val} className={styles.treeNode}>
        <div className={styles.treeRow}>
          {node.left  && <div className={styles.treeConnL} />}
          <div className={styles.treeCircle} style={{ '--nc': color }}>
            {node.val}
          </div>
          {node.right && <div className={styles.treeConnR} />}
        </div>
        {(node.left || node.right) && (
          <div className={styles.treeChildren}>
            <div className={styles.treeChild}>{renderNode(node.left,  depth + 1)}</div>
            <div className={styles.treeChild}>{renderNode(node.right, depth + 1)}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.treeWrap}>
      {renderNode(tree)}
      {visited.length > 0 && (
        <div className={styles.visitedRow}>
          <span className={styles.visitedLabel}>Visited:</span>
          {visited.map((v, i) => <span key={i} className={styles.visitedVal}>{v}</span>)}
        </div>
      )}
    </div>
  );
}

// ─── Graph ───────────────────────────────────────────────────────────────────

const GRAPH_NODES = {
  A: { x: 260, y: 60 }, B: { x: 120, y: 180 }, C: { x: 400, y: 180 },
  D: { x: 60,  y: 300 }, E: { x: 200, y: 300 }, F: { x: 340, y: 300 }, G: { x: 460, y: 300 },
};
const GRAPH_EDGES = [
  ['A','B'],['A','C'],['B','D'],['B','E'],['C','F'],['C','G'],
];

const GRAPH_NODE_COLOR = {
  default:  'var(--node-default)',
  active:   'var(--node-active)',
  visiting: 'var(--node-comparing)',
  visited:  'var(--node-visited)',
  done:     'var(--node-done)',
};

function GraphViz({ viz }) {
  const { nodeStates = {}, edgeStates = {} } = viz;

  return (
    <svg className={styles.graphSvg} viewBox="0 0 520 370" preserveAspectRatio="xMidYMid meet">
      {GRAPH_EDGES.map(([a, b]) => {
        const pa = GRAPH_NODES[a], pb = GRAPH_NODES[b];
        const key = `${a}-${b}`;
        const es  = edgeStates[key] || edgeStates[`${b}-${a}`] || 'default';
        return (
          <line key={key}
            x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
            stroke={es === 'active' ? 'var(--node-active)' : es === 'visited' ? 'var(--node-visited)' : 'var(--border)'}
            strokeWidth={es === 'active' ? 2 : 1}
          />
        );
      })}
      {Object.entries(GRAPH_NODES).map(([id, pos]) => {
        const ns = nodeStates[id] || 'default';
        const c  = GRAPH_NODE_COLOR[ns] || GRAPH_NODE_COLOR.default;
        return (
          <g key={id}>
            <circle cx={pos.x} cy={pos.y} r={22}
              fill={`color-mix(in srgb, ${c} 20%, transparent)`}
              stroke={c} strokeWidth={ns === 'active' ? 2.5 : 1.5}
            />
            <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central"
              fill={c} fontSize={12} fontWeight={700} fontFamily="var(--font-mono)">
              {id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Matrix ──────────────────────────────────────────────────────────────────

function MatrixViz({ viz }) {
  const { matrix = [] } = viz;

  return (
    <div className={styles.matrixWrap}>
      {matrix.map((row, r) => (
        <div key={r} className={styles.matrixRow}>
          {row.map((cell, c) => {
            const color = CELL_COLOR[cell.state] || CELL_COLOR.idle;
            return (
              <div key={c} className={styles.matCell} style={{ '--cc': color }}>
                {cell.val ?? cell.value}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── HashMap ─────────────────────────────────────────────────────────────────

function HashMapViz({ viz }) {
  const { buckets = [], activeBucket = -1, resultIndices = [], nums, activeIndex = -1 } = viz;

  return (
    <div className={styles.hmWrap}>
      {/* Input array row — shown when scenario provides nums (e.g. two-sum) */}
      {nums && nums.length > 0 && (
        <div className={styles.hmInputRow}>
          <span className={styles.hmRowLabel}>input</span>
          {nums.map((n, i) => {
            const isActive  = i === activeIndex;
            const isResult  = resultIndices.includes(i);
            const cc = isResult
              ? 'var(--node-visited)'
              : isActive
              ? 'var(--node-active)'
              : 'var(--node-default)';
            return (
              <div key={i} className={styles.cell} style={{ '--cc': cc }}>
                <div className={styles.cellVal}>{n}</div>
                <div className={styles.cellIdx}>{i}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hash table */}
      <div className={styles.hmTableLabel}>hash table</div>
      {buckets.map((bucket, i) => {
        const isActive = i === activeBucket;
        return (
          <div key={i} className={styles.hmBucket}
            style={{
              border:     isActive ? '1.5px solid var(--node-active)' : undefined,
              background: isActive ? 'color-mix(in srgb, var(--node-active) 10%, transparent)' : undefined,
            }}>
            <span className={styles.hmIdx}>[{i}]</span>
            {bucket.map((entry, j) => (
              <span key={j} className={styles.hmEntry}
                style={{ background: isActive ? 'var(--node-active)' : undefined }}>
                {entry.key}:{entry.value}
              </span>
            ))}
            {bucket.length === 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>—</span>}
          </div>
        );
      })}
      {resultIndices.length > 0 && (
        <div className={styles.hmResult}>Result: [{resultIndices.join(', ')}]</div>
      )}
    </div>
  );
}

// ─── DP table ────────────────────────────────────────────────────────────────

const INF_VAL = 999;

function dpColor(i, active, base, deps) {
  if (i === active)       return CELL_COLOR.active;
  if (deps.includes(i))   return CELL_COLOR.comparing;
  if (base.includes(i))   return CELL_COLOR.done;
  return CELL_COLOR.idle;
}

function DPViz({ viz }) {
  const is2D = viz.kind === '2d' || (viz.table && !viz.dp);

  if (is2D) {
    const table     = viz.table || [];
    const aR        = viz.activeRow ?? -1;
    const aC        = viz.activeCol ?? -1;
    const deps      = viz.deps    || [];
    const rowLabels = viz.rowLabels || [];
    const colLabels = viz.colLabels || [];
    if (!table.length) return null;

    return (
      <div className={styles.dpGrid} style={{ overflowX: 'auto' }}>
        {/* col headers */}
        <div className={styles.dpGridRow}>
          <div className={styles.dpHdr} style={{ minWidth: 52, background: 'transparent', border: 'none' }} />
          {colLabels.map((lbl, c) => (
            <div key={c} className={styles.dpHdr}>{lbl}</div>
          ))}
        </div>
        {table.map((row, r) => (
          <div key={r} className={styles.dpGridRow}>
            <div className={styles.dpHdr}>{rowLabels[r] ?? r}</div>
            {row.map((val, c) => {
              const isDep    = deps.some((d) => d.r === r && d.c === c);
              const isActive = r === aR && c === aC;
              let color = CELL_COLOR.idle;
              if (isActive) color = CELL_COLOR.active;
              else if (isDep) color = CELL_COLOR.comparing;
              return (
                <div key={c} className={styles.dpCell} style={{ '--cc': color }}>
                  {val === INF_VAL ? '∞' : val}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // 1D
  const dp     = viz.dp || [];
  const active = viz.active ?? -1;
  const base   = viz.base   || [];
  const deps   = viz.deps   || [];
  const labels = viz.labels || dp.map((_, i) => `[${i}]`);

  if (!dp.length) return null;

  return (
    <div style={{ padding: 12, overflowX: 'auto' }}>
      <div className={styles.dpRow}>
        {dp.map((val, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div className={styles.dpHdr}>{labels[i]}</div>
            <div className={styles.dpCell} style={{ '--cc': dpColor(i, active, base, deps) }}>
              {val === INF_VAL ? '∞' : val ?? '?'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── String ──────────────────────────────────────────────────────────────────

function StringViz({ viz }) {
  const chars = viz.chars || viz.text || (viz.str ? viz.str.split('') : []);

  return (
    <div className={styles.strWrap}>
      {chars.map((ch, i) => {
        const color = CELL_COLOR[ch.state] || CELL_COLOR.idle;
        const char  = typeof ch === 'string' ? ch : ch.char ?? ch.val;
        return (
          <div key={i} className={styles.strCell} style={{ '--cc': color }}>
            {char}
          </div>
        );
      })}
    </div>
  );
}

// ─── Set / operations ─────────────────────────────────────────────────────────

function SetViz({ viz }) {
  // contains-duplicate mode
  if (viz.nums && viz.k !== undefined) {
    const { nums = [], activeIndex = -1, windowIndices = [], foundIndices = [] } = viz;
    return (
      <div className={styles.setWrap}>
        <div className={styles.setRow}>
          <span className={styles.setRowLabel}>nums</span>
          {nums.map((n, i) => {
            const active  = activeIndex === i;
            const found   = foundIndices.includes(i);
            const inWin   = windowIndices.includes(i);
            const cc = found ? 'var(--node-visited)' : active ? 'var(--node-active)' : inWin ? 'var(--node-comparing)' : 'var(--node-default)';
            return (
              <div key={i} className={styles.cell} style={{ '--cc': cc }}>
                <div className={styles.cellVal}>{n}</div>
                <div className={styles.cellIdx}>{i}</div>
              </div>
            );
          })}
        </div>
        {viz.k !== undefined && <div className={styles.setBadge}>k = {viz.k}</div>}
      </div>
    );
  }

  // two-pointers mode
  if (viz.arr1) {
    const { arr1 = [], arr2 = [], result = [], activeI = -1, activeJ = -1 } = viz;
    const renderArr = (label, arr, active) => (
      <div className={styles.setRow}>
        <span className={styles.setRowLabel}>{label}</span>
        {arr.map((n, i) => (
          <div key={i} className={styles.cell} style={{ '--cc': active === i ? 'var(--node-active)' : 'var(--node-default)' }}>
            <div className={styles.cellVal}>{n}</div>
            <div className={styles.cellIdx}>{i}</div>
          </div>
        ))}
      </div>
    );
    return (
      <div className={styles.setWrap}>
        {renderArr('A', arr1, activeI)}
        {renderArr('B', arr2, activeJ)}
        {result.length > 0 && (
          <div className={styles.setRow}>
            <span className={styles.setRowLabel}>result</span>
            {result.map((n, i) => (
              <div key={i} className={styles.cell} style={{ '--cc': 'var(--node-visited)' }}>
                <div className={styles.cellVal}>{n}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // set operations (Venn)
  const { setA = [], setB = [], union = [], intersect = [], diff = [], highlightA = [], highlightB = [], activeOp } = viz;
  const elColor = (el, isA) => {
    if (intersect.includes(el)) return 'var(--node-comparing)';
    return isA ? 'var(--node-active)' : 'var(--node-done)';
  };
  return (
    <div className={styles.setWrap}>
      <div className={styles.vennRow}>
        <div className={styles.setCircle}>
          <div className={styles.setCircleLabel}>A</div>
          <div className={styles.setElems}>
            {setA.map((el) => (
              <span key={el} className={styles.setElem} style={{ '--ec': highlightA.includes(el) ? elColor(el, true) : 'var(--node-default)' }}>{el}</span>
            ))}
          </div>
        </div>
        {activeOp && <div className={styles.setBadge}>{activeOp === 'union' ? 'A ∪ B' : activeOp === 'intersect' ? 'A ∩ B' : activeOp === 'diff' ? 'A − B' : activeOp}</div>}
        <div className={styles.setCircle}>
          <div className={styles.setCircleLabel}>B</div>
          <div className={styles.setElems}>
            {setB.map((el) => (
              <span key={el} className={styles.setElem} style={{ '--ec': highlightB.includes(el) ? elColor(el, false) : 'var(--node-default)' }}>{el}</span>
            ))}
          </div>
        </div>
      </div>
      {(union.length > 0 || diff.length > 0 || intersect.length > 0) && (
        <div className={styles.setResultRow}>
          {union.length > 0 && <div className={styles.setResult}><span className={styles.setResultLabel}>A∪B</span>{union.map((el) => <span key={el} className={styles.setElem} style={{ '--ec': 'var(--node-visited)' }}>{el}</span>)}</div>}
          {intersect.length > 0 && <div className={styles.setResult}><span className={styles.setResultLabel}>A∩B</span>{intersect.map((el) => <span key={el} className={styles.setElem} style={{ '--ec': 'var(--node-comparing)' }}>{el}</span>)}</div>}
          {diff.length > 0 && <div className={styles.setResult}><span className={styles.setResultLabel}>A−B</span>{diff.map((el) => <span key={el} className={styles.setElem} style={{ '--ec': 'var(--pod-crash)' }}>{el}</span>)}</div>}
        </div>
      )}
    </div>
  );
}
