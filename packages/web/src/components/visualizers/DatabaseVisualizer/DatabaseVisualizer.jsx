import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './database-engine';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import VariablesPanel from '../../shared/VariablesPanel/VariablesPanel';
import styles from './DatabaseVisualizer.module.css';

export default function DatabaseVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.mainArea}>
        <div className={styles.vizArea}>
          {activeId === 'btree' && <BTreeView viz={viz} />}
          {activeId === 'indexing' && <IndexingView viz={viz} />}
          {activeId === 'transactions' && <TransactionsView viz={viz} />}
          {activeId === 'joins' && <JoinsView viz={viz} />}
        </div>

        <div className={styles.sidePanel}>
          <VariablesPanel vars={viz?.vars} result={viz?.result} />

          {viz.events?.length > 0 && (
            <div className={styles.events}>
              <div className={styles.eventsLabel}>SQL Operations</div>
              {viz.events.slice(-5).map((ev, i) => (
                <div key={i} className={`${styles.event} ${styles[`ev-${ev.type}`]}`}>
                  <span className={styles.evDot} />
                  <span className={styles.evMsg}>{ev.msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.bottomPanels}>
        <CodePanel code={active.code} language={active.language} />
        <div className={styles.rightPanels}>
          <MetricsPanel metrics={metrics} />
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}

/* ========== B-TREE VIEW ========== */
function BTreeView({ viz }) {
  const nodes = viz.nodes || [];
  const rootNode = nodes.find((n) => n.id === 'root');

  return (
    <div className={styles.btreeContainer}>
      <div className={styles.btreeLabel}>
        B-Tree ({viz.operation === 'search' ? '🔍 Searching' : '✏ Inserting'} {viz.target !== null ? viz.target : ''})
      </div>
      <svg className={styles.btreeSvg} viewBox="0 0 600 240" preserveAspectRatio="xMidYMid meet">
        <BTreeSVG nodes={nodes} rootNode={rootNode} />
      </svg>
    </div>
  );
}

function BTreeSVG({ nodes }) {
  const rootNode = nodes.find((n) => n.id === 'root');
  if (!rootNode) {
    return <text x="300" y="120" textAnchor="middle" fill="var(--text-muted)" fontSize="14">Tree is empty</text>;
  }

  const positions = computePositions(nodes);

  return (
    <>
      {/* Edges */}
      {nodes.map((node) =>
        (node.children || []).map((childId, i) => {
          const parentPos = positions[node.id];
          const childPos = positions[childId];
          if (!parentPos || !childPos) return null;
          return (
            <line
              key={`${node.id}-${childId}`}
              x1={parentPos.x} y1={parentPos.y + 18}
              x2={childPos.x} y2={childPos.y - 18}
              stroke="var(--border)" strokeWidth="1.5"
            />
          );
        })
      )}
      {/* Nodes */}
      {nodes.map((node) => {
        const pos = positions[node.id];
        if (!pos) return null;
        const width = Math.max(60, node.keys.length * 30 + 20);
        return (
          <g key={node.id}>
            <rect
              x={pos.x - width / 2} y={pos.y - 18}
              width={width} height={36}
              rx="6" ry="6"
              fill={node.active ? 'color-mix(in srgb, var(--node-active) 20%, var(--bg-secondary))' : 'var(--bg-secondary)'}
              stroke={node.active ? 'var(--node-active)' : node.type === 'internal' ? 'var(--node-comparing)' : 'var(--border)'}
              strokeWidth={node.active ? '2' : '1.5'}
            />
            <text x={pos.x} y={pos.y + 5} textAnchor="middle" fill={node.active ? 'var(--node-active)' : 'var(--text-primary)'} fontSize="13" fontFamily="var(--font-mono)" fontWeight="600">
              {node.keys.join(' | ') || '—'}
            </text>
          </g>
        );
      })}
    </>
  );
}

function computePositions(nodes) {
  const positions = {};
  const rootNode = nodes.find((n) => n.id === 'root');
  if (!rootNode) return positions;

  const levelY = { 0: 40, 1: 120, 2: 200 };
  const assignPos = (nodeId, level, xMin, xMax) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const x = (xMin + xMax) / 2;
    const y = levelY[level] || 40 + level * 80;
    positions[nodeId] = { x, y };
    const children = node.children || [];
    if (children.length > 0) {
      const slotW = (xMax - xMin) / children.length;
      children.forEach((childId, i) => {
        assignPos(childId, level + 1, xMin + i * slotW, xMin + (i + 1) * slotW);
      });
    }
  };

  assignPos('root', 0, 50, 550);
  return positions;
}

/* ========== INDEXING VIEW ========== */
function IndexingView({ viz }) {
  const rows = viz.rows || [];
  const hasIndex = !!viz.index;

  return (
    <div className={styles.indexingContainer}>
      <div className={styles.indexingHeader}>
        <div className={styles.planBadge} data-plan={viz.plan}>
          {viz.plan === 'index-scan' ? '⚡ Index Scan' : '🐢 Sequential Scan'}
        </div>
        {hasIndex && (
          <div className={styles.indexBadge}>
            Index: <span className={styles.indexName}>idx_users_age (B-Tree)</span>
          </div>
        )}
      </div>

      <div className={styles.tableGrid}>
        <div className={styles.tableHeader}>
          <span>id</span><span>name</span><span>age</span><span>state</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.id}
            className={`${styles.tableRow} ${row.active ? styles.rowActive : ''} ${row.matched ? styles.rowMatched : ''}`}
          >
            <span>{row.id}</span>
            <span>{row.name}</span>
            <span className={row.age === 28 ? styles.targetAge : ''}>{row.age}</span>
            <span>{row.state}</span>
          </div>
        ))}
      </div>

      {hasIndex && (
        <div className={styles.indexView}>
          <div className={styles.indexLabel}>B-Tree Index (age → row pointers)</div>
          <div className={styles.indexEntries}>
            {viz.index.tree.map((entry) => (
              <div key={entry.key} className={`${styles.indexEntry} ${entry.key === 28 ? styles.indexEntryActive : ''}`}>
                <span className={styles.indexKey}>{entry.key}</span>
                <span className={styles.indexArrow}>→</span>
                <span className={styles.indexRowIds}>[{entry.rowIds.join(', ')}]</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== TRANSACTIONS VIEW ========== */
function TransactionsView({ viz }) {
  const [t1, t2] = viz.transactions || [{}, {}];
  const row = viz.rows?.[0];

  return (
    <div className={styles.txnLayout}>
      <TransactionColumn txn={t1} colorVar="var(--node-active)" />

      <div className={styles.txnCenter}>
        <div className={styles.txnCenterLabel}>Shared Data</div>
        {row && (
          <div className={`${styles.sharedRow} ${row.lockedBy ? styles.sharedRowLocked : ''}`}>
            <div className={styles.sharedRowHeader}>
              <span className={styles.sharedRowId}>accounts.id={row.id}</span>
              {row.lockedBy && (
                <span className={styles.lockBadge}>🔒 {row.lockedBy}</span>
              )}
            </div>
            <div className={styles.sharedRowVersion}>version: v{row.version}</div>
            <div className={styles.mvccVersions}>
              <div className={styles.mvccRow}>
                <span className={styles.mvccTxn}>T1 sees:</span>
                <span className={styles.mvccVal}>{row.visible?.T1 ?? row.val}</span>
              </div>
              <div className={styles.mvccRow}>
                <span className={styles.mvccTxn}>T2 sees:</span>
                <span className={styles.mvccVal}>{row.visible?.T2 ?? row.val}</span>
              </div>
            </div>
          </div>
        )}

        {viz.locks?.length > 0 && (
          <div className={styles.locksPanel}>
            <div className={styles.locksLabel}>Active Locks</div>
            {viz.locks.map((lock, i) => (
              <div key={i} className={styles.lockEntry}>
                <span className={styles.lockResource}>{lock.resource}</span>
                <span className={styles.lockType}>{lock.type}</span>
                <span className={styles.lockHolder}>{lock.holder}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <TransactionColumn txn={t2} colorVar="var(--kafka-producer)" />
    </div>
  );
}

function TransactionColumn({ txn, colorVar }) {
  if (!txn) return null;
  const statusColor = {
    idle: 'var(--text-muted)',
    active: colorVar,
    waiting: 'var(--node-comparing)',
    committed: 'var(--pod-running)',
    rolled_back: 'var(--pod-crash)',
  };

  return (
    <div className={styles.txnCol}>
      <div className={styles.txnHeader} style={{ '--txn-color': colorVar }}>
        <span className={styles.txnId}>{txn.id}</span>
        <span className={styles.txnStatus} style={{ color: statusColor[txn.status] || 'var(--text-muted)' }}>
          {txn.status}
        </span>
      </div>
      <div className={styles.txnOps}>
        {(txn.ops || []).map((op, i) => (
          <div key={i} className={styles.txnOp}>
            <span className={styles.txnOpNum}>{i + 1}</span>
            <span className={styles.txnOpText}>{op}</span>
          </div>
        ))}
        {(!txn.ops || txn.ops.length === 0) && (
          <div className={styles.txnEmpty}>— idle —</div>
        )}
      </div>
    </div>
  );
}

/* ========== JOINS VIEW ========== */
function JoinsView({ viz }) {
  const leftRows = viz.leftTable || [];
  const rightRows = viz.rightTable || [];

  return (
    <div className={styles.joinsContainer}>
      <div className={styles.algorithmBadge}>
        {viz.algorithm === 'hash' ? '⚡ Hash Join — O(n+m)' : '🔄 Nested Loop — O(n×m)'}
      </div>

      <div className={styles.joinsLayout}>
        <div className={styles.joinTable}>
          <div className={styles.joinTableLabel}>employees (left)</div>
          <div className={styles.joinTableHeader}><span>id</span><span>name</span><span>dept_id</span></div>
          {leftRows.map((row) => (
            <div key={row.id} className={`${styles.joinRow} ${row.active ? styles.joinRowActive : ''} ${row.matched ? styles.joinRowMatched : ''}`}>
              <span>{row.id}</span>
              <span>{row.name}</span>
              <span>{row.deptId}</span>
            </div>
          ))}
        </div>

        <div className={styles.joinCenter}>
          <div className={styles.joinCenterLabel}>JOIN ON</div>
          <div className={styles.joinCondition}>dept_id = id</div>
          {Object.keys(viz.hashTable || {}).length > 0 && (
            <div className={styles.hashTableView}>
              <div className={styles.hashTableLabel}>Hash Table</div>
              {Object.entries(viz.hashTable).map(([k, v]) => (
                <div key={k} className={styles.hashEntry}>
                  <span className={styles.hashKey}>{k}</span>
                  <span>→</span>
                  <span className={styles.hashVal}>{v}</span>
                </div>
              ))}
            </div>
          )}
          {(viz.joined || []).length > 0 && (
            <div className={styles.joinedRows}>
              <div className={styles.joinedLabel}>Result</div>
              {viz.joined.map((r, i) => (
                <div key={i} className={styles.joinedRow}>
                  {r.name} | {r.dept}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.joinTable}>
          <div className={styles.joinTableLabel}>departments (right)</div>
          <div className={styles.joinTableHeader}><span>id</span><span>dept</span></div>
          {rightRows.map((row) => (
            <div key={row.id} className={`${styles.joinRow} ${row.active ? styles.joinRowActive : ''} ${row.matched ? styles.joinRowMatched : ''}`}>
              <span>{row.id}</span>
              <span>{row.dept}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
