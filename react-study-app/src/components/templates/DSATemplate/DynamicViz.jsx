import styles from './DSATemplate.module.css';

/**
 * Auto-detects what the step contains and renders the right data structure.
 * No props needed beyond viz (the current step snapshot).
 */
export default function DynamicViz({ viz }) {
  if (!viz) return null;

  // Explicit type hint wins
  const type = viz.type || detectType(viz);

  switch (type) {
    case 'array':      return <ArrayViz viz={viz} />;
    case 'sort':       return <SortViz viz={viz} />;
    case 'linkedlist': return <LinkedListViz viz={viz} />;
    case 'tree':       return <TreeViz viz={viz} />;
    case 'graph':      return <GraphViz viz={viz} />;
    case 'matrix':     return <MatrixViz viz={viz} />;
    case 'hashmap':    return <HashMapViz viz={viz} />;
    case 'dp':         return <DPViz viz={viz} />;
    case 'string':     return <StringViz viz={viz} />;
    case 'set':        return <SetViz viz={viz} />;
    default:           return null;
  }
}

function detectType(viz) {
  if (viz.cells)                               return 'array';
  if (viz.arr && viz.arr[0]?.state !== undefined) return 'sort';
  if (viz.nodes && 'origNext' in viz)          return 'linkedlist';
  if (viz.tree)                                return 'tree';
  if (viz.nodeStates)                          return 'graph';
  if (viz.matrix)                              return 'matrix';
  if (viz.buckets)                             return 'hashmap';
  if (viz.dp)                                  return 'dp';
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

function LinkedListViz({ viz }) {
  const { nodes = [], pointers = {} } = viz;

  return (
    <div className={styles.llWrap}>
      {nodes.map((n, i) => {
        const color = NODE_COLOR[n.state] || NODE_COLOR.default;
        const ptrs = Object.entries(pointers)
          .filter(([, v]) => v === n.val || v === i)
          .map(([k]) => k);

        return (
          <div key={i} className={styles.llItem}>
            <div className={styles.llNode} style={{ '--nc': color }}>
              <span className={styles.llVal}>{n.val}</span>
              {ptrs.length > 0 && <span className={styles.llPtr}>{ptrs.join('/')}</span>}
            </div>
            {i < nodes.length - 1 && <span className={styles.llArrow}>→</span>}
          </div>
        );
      })}
      <div className={styles.llNull}>∅</div>
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
  const { buckets = [], activeIndex = -1, resultIndices = [] } = viz;

  return (
    <div className={styles.hmWrap}>
      {buckets.map((bucket, i) => (
        <div key={i} className={styles.hmBucket}>
          <span className={styles.hmIdx}>[{i}]</span>
          {bucket.map((entry, j) => (
            <span key={j} className={styles.hmEntry}>{entry.key}:{entry.value}</span>
          ))}
        </div>
      ))}
      {resultIndices.length > 0 && (
        <div className={styles.hmResult}>Result: [{resultIndices.join(', ')}]</div>
      )}
    </div>
  );
}

// ─── DP table ────────────────────────────────────────────────────────────────

function DPViz({ viz }) {
  const { dp = [] } = viz;
  if (!dp.length) return null;

  const is2D = Array.isArray(dp[0]);

  if (!is2D) {
    return (
      <div className={styles.dpRow}>
        {dp.map((cell, i) => (
          <div key={i} className={styles.dpCell} style={{ '--cc': CELL_COLOR[cell.state] || CELL_COLOR.idle }}>
            {cell.val ?? cell}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.dpGrid}>
      {dp.map((row, r) => (
        <div key={r} className={styles.dpGridRow}>
          {row.map((cell, c) => (
            <div key={c} className={styles.dpCell} style={{ '--cc': CELL_COLOR[cell.state] || CELL_COLOR.idle }}>
              {cell.val ?? cell}
            </div>
          ))}
        </div>
      ))}
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
