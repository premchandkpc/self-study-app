import { CELL_COLORS, DSA_NODE_COLORS, GRAPH_NODE_COLORS } from '../../core/constants/colors';
import { detectVizType, DSA_VIZ_TYPES } from '../../core/types/vizTypes';
import styles from '../templates/DSATemplate/DSATemplate.module.css';

const renderers = {};

export function registerDsaRenderer(type, component) {
  renderers[type] = component;
}

export function getDsaRenderer(type) {
  return renderers[type] || null;
}

export function DsaVizRenderer({ viz }) {
  if (!viz) return null;
  const type = detectVizType(viz);

  const Renderer = getDsaRenderer(type);
  if (!Renderer) return null;

  return (
    <div className={styles.dynWrap}>
      <Renderer viz={viz} />
      {viz.vars && Object.keys(viz.vars).length > 0 && (
        <VarsSection vars={viz.vars} result={viz.result} />
      )}
    </div>
  );
}

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
  if (typeof v === 'string') return v.length > 12 ? `"${v.slice(0, 10)}..."` : `"${v}"`;
  if (Array.isArray(v)) {
    const inner = v.slice(0, 6).map((x) => (x === null ? '\u2205' : String(x))).join(', ');
    return `[${inner}${v.length > 6 ? ', ...' : ''}]`;
  }
  if (typeof v === 'object') {
    const entries = Object.entries(v).slice(0, 4);
    if (!entries.length) return '{}';
    return `{${entries.map(([k, val]) => `${k}:${val}`).join(', ')}${Object.keys(v).length > 4 ? ',...' : ''}}`;
  }
  return String(v);
}

// ─── Array cells ────────────────────────────────────────────────────────────

const ArrayViz = ({ viz }) => {
  const { cells = [], pointers = {}, window: win } = viz;
  return (
    <div className={styles.arrayWrap}>
      {cells.map((cell, i) => {
        const val   = cell.value ?? cell.val;
        const color = CELL_COLORS[cell.state] || CELL_COLORS.idle;
        const inWin = win && i >= win.left && i <= win.right;
        const ptrs = Object.entries(pointers).filter(([, v]) => v === i).map(([k]) => k);
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
};

registerDsaRenderer('array', ArrayViz);

// ─── Sort bars ──────────────────────────────────────────────────────────────

const SortViz = ({ viz }) => {
  const { arr = [] } = viz;
  const maxVal = Math.max(...arr.map((b) => b.val), 1);
  return (
    <div className={styles.sortWrap}>
      {arr.map((bar, i) => (
        <div key={i} className={styles.barCol}>
          <div className={styles.bar} style={{
            height: `${(bar.val / maxVal) * 100}%`,
            background: CELL_COLORS[bar.state] || CELL_COLORS.idle,
          }} />
          <div className={styles.barVal}>{bar.val}</div>
        </div>
      ))}
    </div>
  );
};

registerDsaRenderer('sort', SortViz);

// ─── Linked list ────────────────────────────────────────────────────────────

const LL_PTR_LABEL = {
  prev: 'prev', curr: 'curr', next: 'next',
  slow: 'slow', fast: 'fast', meet: 'slow=fast',
  active: '\u25CF', done: '\u2713',
};

function LLNode({ n }) {
  const color = DSA_NODE_COLORS[n.state] || DSA_NODE_COLORS.idle;
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
                  ? <span className={styles.llCycleArrow}>{'\u21A9'} [{cycleTarget}]</span>
                  : <span className={styles.llNull}>{'\u2192'} {'\u2205'}</span>
                : <span className={styles.llArrow}>{'\u2192'}</span>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}

const LinkedListViz = ({ viz }) => {
  if (viz.list1 !== undefined) {
    const list1  = viz.list1  || [];
    const list2  = viz.list2  || [];
    const merged = viz.mergedNodes || [];
    return (
      <div className={styles.llMultiWrap}>
        <LLRow nodes={list1} label="L1" />
        <LLRow nodes={list2} label="L2" />
        {merged.length > 0 && <LLRow nodes={merged} label="Merged" />}
      </div>
    );
  }
  const nodes = viz.nodes || [];
  const cycleTarget = viz.cycleTarget ?? -1;
  return (
    <div className={styles.llMultiWrap}>
      <LLRow nodes={nodes} cycleTarget={cycleTarget} />
    </div>
  );
};

registerDsaRenderer('linkedlist', LinkedListViz);

// ─── BST ────────────────────────────────────────────────────────────────────

const TreeViz = ({ viz }) => {
  const { tree, visited = [] } = viz;
  function renderNode(node) {
    if (!node) return null;
    const color = DSA_NODE_COLORS[node.state] || DSA_NODE_COLORS.default;
    return (
      <div key={node.val} className={styles.treeNode}>
        <div className={styles.treeRow}>
          {node.left  && <div className={styles.treeConnL} />}
          <div className={styles.treeCircle} style={{ '--nc': color }}>{node.val}</div>
          {node.right && <div className={styles.treeConnR} />}
        </div>
        {(node.left || node.right) && (
          <div className={styles.treeChildren}>
            <div className={styles.treeChild}>{renderNode(node.left)}</div>
            <div className={styles.treeChild}>{renderNode(node.right)}</div>
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
};

registerDsaRenderer('tree', TreeViz);

// ─── Graph ──────────────────────────────────────────────────────────────────

const GRAPH_NODES = {
  A: { x: 260, y: 60 }, B: { x: 120, y: 180 }, C: { x: 400, y: 180 },
  D: { x: 60,  y: 300 }, E: { x: 200, y: 300 }, F: { x: 340, y: 300 }, G: { x: 460, y: 300 },
};
const GRAPH_EDGES = [
  ['A','B'],['A','C'],['B','D'],['B','E'],['C','F'],['C','G'],
];

const GraphViz = ({ viz }) => {
  const { nodeStates = {}, edgeStates = {} } = viz;
  return (
    <svg className={styles.graphSvg} viewBox="0 0 520 370" preserveAspectRatio="xMidYMid meet">
      {GRAPH_EDGES.map(([a, b]) => {
        const pa = GRAPH_NODES[a], pb = GRAPH_NODES[b];
        const key = `${a}-${b}`;
        const es = edgeStates[key] || edgeStates[`${b}-${a}`] || 'default';
        return (
          <line key={key} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
            stroke={es === 'active' ? 'var(--node-active)' : es === 'visited' ? 'var(--node-visited)' : 'var(--border)'}
            strokeWidth={es === 'active' ? 2 : 1} />
        );
      })}
      {Object.entries(GRAPH_NODES).map(([id, pos]) => {
        const ns = nodeStates[id] || 'default';
        const c = GRAPH_NODE_COLORS[ns] || GRAPH_NODE_COLORS.default;
        return (
          <g key={id}>
            <circle cx={pos.x} cy={pos.y} r={22}
              fill={`color-mix(in srgb, ${c} 20%, transparent)`} stroke={c}
              strokeWidth={ns === 'active' ? 2.5 : 1.5} />
            <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central"
              fill={c} fontSize={12} fontWeight={700} fontFamily="var(--font-mono)">{id}</text>
          </g>
        );
      })}
    </svg>
  );
};

registerDsaRenderer('graph', GraphViz);

// ─── Matrix ─────────────────────────────────────────────────────────────────

const MatrixViz = ({ viz }) => {
  const { matrix = [] } = viz;
  return (
    <div className={styles.matrixWrap}>
      {matrix.map((row, r) => (
        <div key={r} className={styles.matrixRow}>
          {row.map((cell, c) => (
            <div key={c} className={styles.matCell} style={{ '--cc': CELL_COLORS[cell.state] || CELL_COLORS.idle }}>
              {cell.val ?? cell.value}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

registerDsaRenderer('matrix', MatrixViz);

// ─── HashMap ────────────────────────────────────────────────────────────────

const HashMapViz = ({ viz }) => {
  const { buckets = [], activeBucket = -1, resultIndices = [], nums, activeIndex = -1 } = viz;
  return (
    <div className={styles.hmWrap}>
      {nums?.length > 0 && (
        <div className={styles.hmInputRow}>
          <span className={styles.hmRowLabel}>input</span>
          {nums.map((n, i) => {
            const cc = resultIndices.includes(i) ? 'var(--node-visited)' : i === activeIndex ? 'var(--node-active)' : 'var(--node-default)';
            return (
              <div key={i} className={styles.cell} style={{ '--cc': cc }}>
                <div className={styles.cellVal}>{n}</div>
                <div className={styles.cellIdx}>{i}</div>
              </div>
            );
          })}
        </div>
      )}
      <div className={styles.hmTableLabel}>hash table</div>
      {buckets.map((bucket, i) => {
        const isActive = i === activeBucket;
        return (
          <div key={i} className={styles.hmBucket} style={{
            border: isActive ? '1.5px solid var(--node-active)' : undefined,
            background: isActive ? 'color-mix(in srgb, var(--node-active) 10%, transparent)' : undefined,
          }}>
            <span className={styles.hmIdx}>[{i}]</span>
            {bucket.map((entry, j) => (
              <span key={j} className={styles.hmEntry} style={{ background: isActive ? 'var(--node-active)' : undefined }}>
                {entry.key}:{entry.value}
              </span>
            ))}
            {bucket.length === 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>---</span>}
          </div>
        );
      })}
      {resultIndices.length > 0 && <div className={styles.hmResult}>Result: [{resultIndices.join(', ')}]</div>}
    </div>
  );
};

registerDsaRenderer('hashmap', HashMapViz);

// ─── DP table ───────────────────────────────────────────────────────────────

const INF_VAL = 999;

function dpColor(i, active, base, deps) {
  if (i === active) return CELL_COLORS.active;
  if (deps.includes(i)) return CELL_COLORS.comparing;
  if (base.includes(i)) return CELL_COLORS.done;
  return CELL_COLORS.idle;
}

const DPViz = ({ viz }) => {
  const is2D = viz.kind === '2d' || (viz.table && !viz.dp);
  if (is2D) {
    const table = viz.table || [];
    const aR = viz.activeRow ?? -1;
    const aC = viz.activeCol ?? -1;
    const deps = viz.deps || [];
    const rowLabels = viz.rowLabels || [];
    const colLabels = viz.colLabels || [];
    if (!table.length) return null;
    return (
      <div className={styles.dpGrid} style={{ overflowX: 'auto' }}>
        <div className={styles.dpGridRow}>
          <div className={styles.dpHdr} style={{ minWidth: 52, background: 'transparent', border: 'none' }} />
          {colLabels.map((lbl, c) => <div key={c} className={styles.dpHdr}>{lbl}</div>)}
        </div>
        {table.map((row, r) => (
          <div key={r} className={styles.dpGridRow}>
            <div className={styles.dpHdr}>{rowLabels[r] ?? r}</div>
            {row.map((val, c) => {
              const isDep = deps.some((d) => d.r === r && d.c === c);
              const isActive = r === aR && c === aC;
              let color = CELL_COLORS.idle;
              if (isActive) color = CELL_COLORS.active;
              else if (isDep) color = CELL_COLORS.comparing;
              return <div key={c} className={styles.dpCell} style={{ '--cc': color }}>{val === INF_VAL ? '\u221E' : val}</div>;
            })}
          </div>
        ))}
      </div>
    );
  }
  const dp = viz.dp || [];
  const active = viz.active ?? -1;
  const base = viz.base || [];
  const deps = viz.deps || [];
  const labels = viz.labels || dp.map((_, i) => `[${i}]`);
  if (!dp.length) return null;
  return (
    <div style={{ padding: 12, overflowX: 'auto' }}>
      <div className={styles.dpRow}>
        {dp.map((val, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div className={styles.dpHdr}>{labels[i]}</div>
            <div className={styles.dpCell} style={{ '--cc': dpColor(i, active, base, deps) }}>
              {val === INF_VAL ? '\u221E' : val ?? '?'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

registerDsaRenderer('dp', DPViz);

// ─── String ─────────────────────────────────────────────────────────────────

const StringViz = ({ viz }) => {
  const chars = viz.chars || viz.text || (viz.str ? viz.str.split('') : []);
  return (
    <div className={styles.strWrap}>
      {chars.map((ch, i) => {
        const color = CELL_COLORS[ch.state] || CELL_COLORS.idle;
        const char = typeof ch === 'string' ? ch : ch.char ?? ch.val;
        return <div key={i} className={styles.strCell} style={{ '--cc': color }}>{char}</div>;
      })}
    </div>
  );
};

registerDsaRenderer('string', StringViz);

// ─── Set / operations ───────────────────────────────────────────────────────

const SetViz = ({ viz }) => {
  if (viz.nums && viz.k !== undefined) {
    const { nums = [], activeIndex = -1, windowIndices = [], foundIndices = [] } = viz;
    return (
      <div className={styles.setWrap}>
        <div className={styles.setRow}>
          <span className={styles.setRowLabel}>nums</span>
          {nums.map((n, i) => {
            const cc = foundIndices.includes(i) ? 'var(--node-visited)' : activeIndex === i ? 'var(--node-active)' : windowIndices.includes(i) ? 'var(--node-comparing)' : 'var(--node-default)';
            return (
              <div key={i} className={styles.cell} style={{ '--cc': cc }}>
                <div className={styles.cellVal}>{n}</div>
                <div className={styles.cellIdx}>{i}</div>
              </div>
            );
          })}
        </div>
        <div className={styles.setBadge}>k = {viz.k}</div>
      </div>
    );
  }
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
            {result.map((n, i) => <div key={i} className={styles.cell} style={{ '--cc': 'var(--node-visited)' }}><div className={styles.cellVal}>{n}</div></div>)}
          </div>
        )}
      </div>
    );
  }
  const { setA = [], setB = [], union = [], intersect = [], diff = [], highlightA = [], highlightB = [], activeOp } = viz;
  const elColor = (el, isA) => intersect.includes(el) ? 'var(--node-comparing)' : isA ? 'var(--node-active)' : 'var(--node-done)';
  return (
    <div className={styles.setWrap}>
      <div className={styles.vennRow}>
        <div className={styles.setCircle}>
          <div className={styles.setCircleLabel}>A</div>
          <div className={styles.setElems}>
            {setA.map((el) => <span key={el} className={styles.setElem} style={{ '--ec': highlightA.includes(el) ? elColor(el, true) : 'var(--node-default)' }}>{el}</span>)}
          </div>
        </div>
        {activeOp && <div className={styles.setBadge}>{activeOp === 'union' ? 'A \u222A B' : activeOp === 'intersect' ? 'A \u2229 B' : activeOp === 'diff' ? 'A \u2212 B' : activeOp}</div>}
        <div className={styles.setCircle}>
          <div className={styles.setCircleLabel}>B</div>
          <div className={styles.setElems}>
            {setB.map((el) => <span key={el} className={styles.setElem} style={{ '--ec': highlightB.includes(el) ? elColor(el, false) : 'var(--node-default)' }}>{el}</span>)}
          </div>
        </div>
      </div>
      {(union.length > 0 || diff.length > 0 || intersect.length > 0) && (
        <div className={styles.setResultRow}>
          {union.length > 0 && <div className={styles.setResult}><span className={styles.setResultLabel}>A\u222AB</span>{union.map((el) => <span key={el} className={styles.setElem} style={{ '--ec': 'var(--node-visited)' }}>{el}</span>)}</div>}
          {intersect.length > 0 && <div className={styles.setResult}><span className={styles.setResultLabel}>A\u2229B</span>{intersect.map((el) => <span key={el} className={styles.setElem} style={{ '--ec': 'var(--node-comparing)' }}>{el}</span>)}</div>}
          {diff.length > 0 && <div className={styles.setResult}><span className={styles.setResultLabel}>A\u2212B</span>{diff.map((el) => <span key={el} className={styles.setElem} style={{ '--ec': 'var(--pod-crash)' }}>{el}</span>)}</div>}
        </div>
      )}
    </div>
  );
};

registerDsaRenderer('set', SetViz);
