import { useState } from 'react';
import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { JC_SCENARIOS, JC_COLLECTION_TYPES, JC_CATEGORIES } from './java-collections-engine';
import StepControls from '../../shared/StepControls/StepControls';
import CodePanel from '../../shared/CodePanel/CodePanel';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import styles from './JavaCollectionsVisualizer.module.css';

// ─── Renderers ────────────────────────────────────────────────────────────────

function OpsLog({ ops = [] }) {
  if (!ops.length) return null;
  return (
    <div className={styles.opsLog}>
      {ops.slice(-5).map((op, i) => (
        <div key={i} className={`${styles.opEntry} ${styles[`op-${op.type}`]}`}>
          <span className={styles.opDot} /> {op.msg}
        </div>
      ))}
    </div>
  );
}

function ExceptionBanner({ exception }) {
  if (!exception) return null;
  return (
    <div className={styles.exceptionBanner}>
      <span className={styles.excIcon}>💥</span>
      <div>
        <div className={styles.excType}>{exception.type}</div>
        <div className={styles.excMsg}>{exception.msg}</div>
      </div>
    </div>
  );
}

function ThreadRow({ threads = [] }) {
  if (!threads.length) return null;
  const STATE_COLOR = { running: 'var(--node-default)', waiting: 'var(--node-comparing)', idle: 'var(--text-muted)', blocking: 'var(--pod-crash)' };
  return (
    <div className={styles.threadRow}>
      {threads.map(t => (
        <div key={t.id} className={styles.threadChip} style={{ borderColor: STATE_COLOR[t.state] || 'var(--border)' }}>
          <span className={styles.threadDot} style={{ background: STATE_COLOR[t.state] || 'var(--text-muted)' }} />
          <span className={styles.threadName}>{t.name}</span>
          {t.action && <span className={styles.threadAction}>{t.action}</span>}
        </div>
      ))}
    </div>
  );
}

// ArrayList renderer
function ArrayListRenderer({ viz }) {
  const { cells = [], size = 0, capacity = 0, iterPos = -1 } = viz;
  const STATE_COLOR = {
    idle: 'var(--bg-tertiary)', new: 'var(--node-default)', active: 'var(--node-comparing)',
    removed: 'var(--pod-crash)', shifting: 'var(--node-path)', visited: 'var(--node-visited)',
    null: 'transparent', 'null-elem': 'var(--text-muted)', window: 'var(--accent-blue)',
    error: 'var(--pod-crash)', copying: 'var(--node-path)', orphan: 'var(--text-muted)',
    rehashed: 'var(--node-visited)',
  };
  return (
    <div className={styles.alContainer}>
      <div className={styles.alMeta}>
        <span className={styles.metaBadge}>size: {size}</span>
        <span className={styles.metaBadge}>capacity: {capacity}</span>
      </div>
      <div className={styles.alRow}>
        {cells.map((c, i) => (
          <div key={i} className={styles.alCell} style={{ background: STATE_COLOR[c.state] || 'var(--bg-tertiary)', borderColor: i === iterPos ? 'var(--accent-blue)' : 'var(--border)' }}>
            <span className={styles.alVal}>{c.val !== null ? String(c.val) : ''}</span>
            <span className={styles.alIdx}>{i}</span>
          </div>
        ))}
      </div>
      <div className={styles.alLabels}>
        <span className={styles.alLabel}>← logical size ({size}) →</span>
        <span className={styles.alLabel} style={{ color: 'var(--text-muted)' }}>← allocated capacity ({capacity}) →</span>
      </div>
    </div>
  );
}

// LinkedList renderer
function LinkedListRenderer({ viz }) {
  const { nodes = [], head, tail, cursor } = viz;
  if (nodes.length === 0) {
    return <div className={styles.emptyState}>[ empty list ] head=null tail=null</div>;
  }
  const STATE_COLOR = {
    idle: 'var(--bg-tertiary)', new: 'var(--node-default)', active: 'var(--node-comparing)',
    visited: 'var(--node-visited)', removed: 'var(--pod-crash)', error: 'var(--pod-crash)',
  };
  const ordered = [];
  let cur = head;
  const seen = new Set();
  while (cur !== null && !seen.has(cur)) {
    const n = nodes.find(x => x.id === cur);
    if (!n) break;
    ordered.push(n); seen.add(cur); cur = n.next;
  }
  return (
    <div className={styles.llContainer}>
      <div className={styles.llPointers}>
        <span className={styles.llPointer}>head</span>
        <span className={styles.llArrow}>→</span>
      </div>
      <div className={styles.llRow}>
        {ordered.map((n, i) => (
          <div key={n.id} className={styles.llNodeWrap}>
            <div
              className={`${styles.llNode} ${n.id === cursor ? styles.llCursor : ''}`}
              style={{ background: STATE_COLOR[n.state] || 'var(--bg-tertiary)' }}
            >
              <div className={styles.llNodeVal}>{n.val}</div>
              <div className={styles.llNodeId}>node</div>
            </div>
            {i < ordered.length - 1 && <span className={styles.llArrow}>⟷</span>}
          </div>
        ))}
        <span className={styles.llNull}>null</span>
      </div>
      <div className={styles.llPointers} style={{ justifyContent: 'flex-end', paddingRight: '120px' }}>
        <span className={styles.llArrow}>→</span>
        <span className={styles.llPointer}>tail</span>
      </div>
    </div>
  );
}

// HashMap/HashSet bucket renderer
function BucketRenderer({ viz }) {
  const { buckets = [], capacity = 8, size = 0, threshold = 0, activeBucket = -1, resizing = false } = viz;
  const isSet = viz.collectionType === 'hashset';
  const STATE_COLOR = {
    idle: 'var(--bg-card)', new: 'var(--node-default)', active: 'var(--node-comparing)',
    updated: 'var(--node-path)', removed: 'var(--pod-crash)', error: 'var(--pod-crash)',
    duplicate: 'var(--node-comparing)', 'null-elem': 'var(--text-muted)',
    copying: 'var(--node-path)', rehashed: 'var(--node-visited)', orphan: 'var(--text-muted)',
  };
  const visible = buckets.slice(0, Math.min(capacity, 12));
  return (
    <div className={styles.hmContainer}>
      <div className={styles.hmMeta}>
        <span className={styles.metaBadge}>size: {size}</span>
        <span className={styles.metaBadge}>capacity: {capacity}</span>
        <span className={styles.metaBadge}>threshold: {threshold}</span>
        {resizing && <span className={`${styles.metaBadge} ${styles.badgeWarn}`}>⚡ RESIZING</span>}
      </div>
      <div className={styles.hmGrid}>
        {visible.map((chain, i) => (
          <div key={i} className={`${styles.hmBucket} ${i === activeBucket ? styles.hmBucketActive : ''}`}>
            <div className={styles.hmBucketIdx}>[{i}]</div>
            <div className={styles.hmChain}>
              {chain.length === 0
                ? <span className={styles.hmNull}>∅</span>
                : chain.map((e, j) => (
                  <span key={j} className={styles.hmEntry} style={{ background: STATE_COLOR[e.state] || 'var(--bg-card)' }}>
                    {isSet ? `${e.key}` : `${e.key}→${e.val}`}
                  </span>
                ))
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// TreeMap BST renderer
function TreeMapRenderer({ viz }) {
  const { nodes = [], root = null, comparePath = [] } = viz;
  if (nodes.length === 0) return <div className={styles.emptyState}>[ empty TreeMap ]</div>;
  const STATE_COLOR = {
    idle: 'var(--bg-tertiary)', new: 'var(--node-default)', comparing: 'var(--node-comparing)',
    active: 'var(--node-comparing)', visited: 'var(--node-visited)', error: 'var(--pod-crash)', window: 'var(--accent-blue)',
  };
  // Build levels for display
  const levels = [];
  const buildLevels = (nodeId, depth) => {
    if (nodeId === null) return;
    const n = nodes.find(x => x.id === nodeId);
    if (!n) return;
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(n);
    buildLevels(n.left, depth + 1);
    buildLevels(n.right, depth + 1);
  };
  buildLevels(root, 0);
  return (
    <div className={styles.tmContainer}>
      {levels.map((levelNodes, d) => (
        <div key={d} className={styles.tmLevel}>
          {levelNodes.map(n => (
            <div key={n.id} className={styles.tmNodeWrap}>
              <div
                className={`${styles.tmNode} ${comparePath.includes(n.id) ? styles.tmComparing : ''}`}
                style={{ background: STATE_COLOR[n.state] || 'var(--bg-tertiary)' }}
              >
                <span className={styles.tmKey}>{n.key}</span>
                {n.val && <span className={styles.tmVal}>{n.val}</span>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// PriorityQueue heap renderer
function PriorityQueueRenderer({ viz }) {
  const { heap = [], size = 0 } = viz;
  const STATE_COLOR = {
    idle: 'var(--bg-tertiary)', new: 'var(--node-default)', active: 'var(--node-comparing)',
    removed: 'var(--pod-crash)', swapping: 'var(--node-path)',
  };
  const entries = heap.slice(1, size + 1); // 1-indexed
  if (entries.length === 0) return <div className={styles.emptyState}>[ empty PriorityQueue ]</div>;
  // Build tree levels
  const levels = [];
  let idx = 0, levelSize = 1;
  while (idx < entries.length) {
    levels.push(entries.slice(idx, idx + levelSize));
    idx += levelSize;
    levelSize *= 2;
  }
  return (
    <div className={styles.pqContainer}>
      <div className={styles.pqMeta}>
        <span className={styles.metaBadge}>size: {size}</span>
        <span className={styles.metaBadge}>min: {entries[0]?.val}</span>
      </div>
      <div className={styles.pqTree}>
        {levels.map((row, d) => (
          <div key={d} className={styles.tmLevel}>
            {row.map((e, i) => (
              <div key={i} className={styles.pqNode} style={{ background: STATE_COLOR[e.state] || 'var(--bg-tertiary)' }}>
                {e.val}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.pqArray}>
        {entries.map((e, i) => (
          <div key={i} className={styles.alCell} style={{ background: STATE_COLOR[e.state] || 'var(--bg-tertiary)' }}>
            <span className={styles.alVal}>{e.val}</span>
            <span className={styles.alIdx}>{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ArrayDeque circular buffer renderer
function ArrayDequeRenderer({ viz }) {
  const { slots = [], head = 0, tail = 0, size = 0, capacity = 8 } = viz;
  const STATE_COLOR = {
    idle: 'var(--bg-tertiary)', new: 'var(--node-default)', empty: 'transparent',
    active: 'var(--node-comparing)', error: 'var(--pod-crash)',
  };
  return (
    <div className={styles.adContainer}>
      <div className={styles.hmMeta}>
        <span className={styles.metaBadge}>size: {size}</span>
        <span className={styles.metaBadge}>head: {head}</span>
        <span className={styles.metaBadge}>tail: {tail}</span>
      </div>
      <div className={styles.alRow}>
        {slots.map((s, i) => (
          <div key={i} className={styles.alCell} style={{ background: STATE_COLOR[s.state] || 'var(--bg-tertiary)', borderColor: i === head ? 'var(--node-comparing)' : i === (tail - 1 + capacity) % capacity ? 'var(--node-default)' : 'var(--border)' }}>
            <span className={styles.alVal}>{s.val !== null ? String(s.val) : ''}</span>
            <span className={styles.alIdx}>{i === head ? 'H' : i === (tail - 1 + capacity) % capacity && size > 0 ? 'T' : i}</span>
          </div>
        ))}
      </div>
      <div className={styles.alLabels}>
        <span style={{ color: 'var(--node-comparing)', fontWeight: 600 }}>H=head</span>
        <span style={{ color: 'var(--node-default)', fontWeight: 600, marginLeft: 'var(--space-md)' }}>T=tail</span>
      </div>
    </div>
  );
}

// ConcurrentHashMap segment renderer
function ConcurrentHashMapRenderer({ viz }) {
  const { segments = [], threads = [] } = viz;
  return (
    <div className={styles.chmContainer}>
      <ThreadRow threads={threads} />
      <div className={styles.chmSegments}>
        {segments.map(seg => (
          <div key={seg.id} className={`${styles.chmSeg} ${seg.locked ? styles.chmSegLocked : ''}`}>
            <div className={styles.chmSegHeader}>
              <span>Seg[{seg.id}]</span>
              {seg.locked && <span className={styles.chmLockBadge}>🔒 {seg.locked}</span>}
            </div>
            <div className={styles.chmBuckets}>
              {seg.buckets.map((chain, j) => (
                <div key={j} className={styles.chmBucket}>
                  <span className={styles.hmBucketIdx}>[{j}]</span>
                  {chain.length === 0
                    ? <span className={styles.hmNull}>∅</span>
                    : chain.map((e, k) => (
                      <span key={k} className={styles.hmEntry} style={{ background: e.state === 'new' ? 'var(--node-default)' : e.state === 'updated' ? 'var(--node-path)' : 'var(--bg-card)' }}>
                        {e.key}→{e.val}
                      </span>
                    ))
                  }
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// CopyOnWriteArrayList renderer
function CopyOnWriteRenderer({ viz }) {
  const { main = [], copy = null, threads = [] } = viz;
  const STATE_COLOR = {
    idle: 'var(--bg-tertiary)', new: 'var(--node-default)', copying: 'var(--node-path)',
    active: 'var(--node-comparing)', error: 'var(--pod-crash)',
  };
  return (
    <div className={styles.cowContainer}>
      <ThreadRow threads={threads} />
      <div className={styles.cowLabel}>Main array (committed):</div>
      <div className={styles.alRow}>
        {main.map((c, i) => (
          <div key={i} className={styles.alCell} style={{ background: STATE_COLOR[c.state] || 'var(--bg-tertiary)' }}>
            <span className={styles.alVal}>{c.val}</span>
            <span className={styles.alIdx}>{i}</span>
          </div>
        ))}
        {main.length === 0 && <span className={styles.emptyState}>[ empty ]</span>}
      </div>
      {copy !== null && (
        <>
          <div className={styles.cowLabel} style={{ color: 'var(--node-default)' }}>Write copy (in progress):</div>
          <div className={styles.alRow}>
            {copy.map((c, i) => (
              <div key={i} className={styles.alCell} style={{ background: STATE_COLOR[c.state] || 'var(--bg-tertiary)', borderColor: 'var(--node-default)' }}>
                <span className={styles.alVal}>{c.val}</span>
                <span className={styles.alIdx}>{i}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Route viz to correct renderer
function VizRenderer({ viz }) {
  if (!viz) return null;
  switch (viz.collectionType) {
    case 'arraylist':          return <ArrayListRenderer viz={viz} />;
    case 'linkedlist':         return <LinkedListRenderer viz={viz} />;
    case 'hashmap':
    case 'hashset':            return <BucketRenderer viz={viz} />;
    case 'treemap':            return <TreeMapRenderer viz={viz} />;
    case 'priorityqueue':      return <PriorityQueueRenderer viz={viz} />;
    case 'arraydeque':         return <ArrayDequeRenderer viz={viz} />;
    case 'concurrenthashmap':
    case 'concurrent':         return <ConcurrentHashMapRenderer viz={viz} />;
    case 'copyonwritearraylist': return <CopyOnWriteRenderer viz={viz} />;
    default:                   return <div className={styles.emptyState}>Renderer not found: {viz.collectionType}</div>;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function JavaCollectionsVisualizer() {
  const { activeId, active, viz, select } = useVisualizerScenario(JC_SCENARIOS);
  const [activeType, setActiveType] = useState(JC_SCENARIOS[0].collectionType);
  const [activeCat,  setActiveCat]  = useState(JC_SCENARIOS[0].category);

  const filteredByType = JC_SCENARIOS.filter(s => s.collectionType === activeType);
  const filteredByCat  = filteredByType.filter(s => s.category === activeCat);

  function handleTypeChange(type) {
    setActiveType(type);
    const first = JC_SCENARIOS.find(s => s.collectionType === type && s.category === activeCat)
      ?? JC_SCENARIOS.find(s => s.collectionType === type);
    if (first) select(first.id);
  }

  function handleCatChange(cat) {
    setActiveCat(cat);
    const first = JC_SCENARIOS.find(s => s.collectionType === activeType && s.category === cat);
    if (first) select(first.id);
  }

  const { JC_COLLECTION_TYPES: TYPES, JC_CATEGORIES: CATS } = (() => ({
    JC_COLLECTION_TYPES: [
      { key: 'arraylist', label: 'ArrayList', icon: '📋' },
      { key: 'linkedlist', label: 'LinkedList', icon: '🔗' },
      { key: 'hashmap', label: 'HashMap', icon: '🗺️' },
      { key: 'hashset', label: 'HashSet', icon: '🔵' },
      { key: 'treemap', label: 'TreeMap', icon: '🌲' },
      { key: 'priorityqueue', label: 'PriorityQueue', icon: '⛰️' },
      { key: 'arraydeque', label: 'ArrayDeque', icon: '🔄' },
      { key: 'concurrent', label: 'Concurrent', icon: '🔐' },
    ],
    JC_CATEGORIES: [
      { key: 'flow', label: 'Core Flows', icon: '🔀' },
      { key: 'edge', label: 'Edge Cases', icon: '⚠️' },
      { key: 'concurrency', label: 'Concurrency', icon: '🧵' },
      { key: 'exception', label: 'Exceptions', icon: '💥' },
    ],
  }))();

  return (
    <div className={styles.wrapper}>
      {/* Collection type tabs */}
      <div className={styles.typeTabs}>
        {TYPES.map(t => (
          <button
            key={t.key}
            className={`${styles.typeTab} ${activeType === t.key ? styles.typeTabActive : ''}`}
            onClick={() => handleTypeChange(t.key)}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div className={styles.catTabs}>
        {CATS.map(c => {
          const count = filteredByType.filter(s => s.category === c.key).length;
          return (
            <button
              key={c.key}
              className={`${styles.catTab} ${activeCat === c.key ? styles.catTabActive : ''}`}
              onClick={() => handleCatChange(c.key)}
            >
              {c.icon} {c.label} {count > 0 && <span className={styles.catCount}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Scenario selector */}
      <div className={styles.scenarioRow}>
        {filteredByCat.map(s => (
          <button
            key={s.id}
            className={`${styles.scenBtn} ${activeId === s.id ? styles.scenBtnActive : ''}`}
            onClick={() => select(s.id)}
          >
            {s.icon} {s.label}
          </button>
        ))}
        {filteredByCat.length === 0 && (
          <span className={styles.emptyState}>No scenarios for this combination.</span>
        )}
      </div>

      {/* Narration */}
      <NarrationPanel inline />

      {/* Exception banner */}
      {viz?.exception && <ExceptionBanner exception={viz.exception} />}

      {/* Visualization */}
      <div className={styles.vizArea}>
        <VizRenderer viz={viz} />
        {viz?.ops && <OpsLog ops={viz.ops} />}
      </div>

      {/* Bottom panels */}
      <div className={styles.bottom}>
        <CodePanel code={active?.code} language={active?.language} />
      </div>

      <StepControls />
    </div>
  );
}
