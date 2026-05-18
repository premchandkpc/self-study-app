import { useEffect, useState, useRef } from 'react';
import { useSimulation } from '../../../core/context/SimulationContext';
import { buildSDSteps, SD_CODE } from './sd-engine';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import Button from '../../shared/Button/Button';
import styles from './SystemDesignVisualizer.module.css';

const SCENARIOS = [
  { id: 'lb',    label: 'Load Balancer', icon: '⚖️' },
  { id: 'cache', label: 'Caching',       icon: '💾' },
  { id: 'cdn',   label: 'CDN',           icon: '🌐' },
  { id: 'raft',  label: 'Raft Consensus',icon: '🗳️' },
];

const NODE_STYLE = {
  client:   { fill: 'var(--node-default)',   stroke: 'var(--node-default)',   label: '👤' },
  server:   { fill: 'var(--node-visited)',   stroke: 'var(--node-visited)',   label: '🖥' },
  lb:       { fill: 'var(--node-comparing)', stroke: 'var(--node-comparing)', label: '⚖' },
  cache:    { fill: 'var(--node-blocked)',   stroke: 'var(--node-blocked)',   label: '💾' },
  db:       { fill: 'var(--pod-crash)',      stroke: 'var(--pod-crash)',      label: '🗄' },
  cdn:      { fill: 'var(--kafka-producer)', stroke: 'var(--kafka-producer)', label: '🌐' },
  raft:     { fill: 'var(--node-default)',   stroke: 'var(--node-default)',   label: '●' },
};

const NODE_STATE_OVERRIDE = {
  active: 'var(--node-active)',
  ok:     'var(--pod-running)',
  error:  'var(--pod-crash)',
  warn:   'var(--node-comparing)',
};

const ROLE_COLOR = {
  leader:    'var(--pod-running)',
  candidate: 'var(--node-comparing)',
  follower:  'var(--node-default)',
};

const SVG_W = 620;
const SVG_H = 380;

export default function SystemDesignVisualizer() {
  const { state, dispatch } = useSimulation();
  const [scenario, setScenario] = useState('lb');
  const [viz, setViz] = useState(null);

  function init(sc) {
    setScenario(sc);
    dispatch({ type: 'RESET' });
    dispatch({ type: 'SET_STEPS', payload: buildSDSteps(sc) });
  }

  useEffect(() => { init('lb'); }, []);

  useEffect(() => {
    const step = state.steps[state.currentStep];
    if (step) setViz(step);
  }, [state.currentStep, state.steps]);

  if (!viz) return null;

  const metrics = buildMetrics(scenario, viz.metrics || {});

  return (
    <div className={styles.wrapper}>
      {/* toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          {SCENARIOS.map((sc) => (
            <Button
              key={sc.id}
              variant={scenario === sc.id ? 'primary' : 'ghost'}
              size="sm"
              icon={sc.icon}
              onClick={() => init(sc.id)}
            >
              {sc.label}
            </Button>
          ))}
        </div>
        <NarrationPanel />
      </div>

      {/* SVG diagram */}
      <div className={styles.svgWrap}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className={styles.svg} preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--border)" />
            </marker>
            <marker id="arrowhead-active" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--node-active)" />
            </marker>
            <marker id="arrowhead-ok" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--pod-running)" />
            </marker>
          </defs>

          {/* edges */}
          {(viz.edges || []).map((edge) => (
            <EdgeLine
              key={`${edge.from}-${edge.to}`}
              edge={edge}
              nodes={viz.nodes}
              packets={viz.packets || []}
            />
          ))}

          {/* nodes */}
          {(viz.nodes || []).map((n) => (
            <DiagramNode key={n.id} node={n} scenario={scenario} />
          ))}

          {/* packet animations */}
          {(viz.packets || []).map((pkt) => (
            <PacketDot key={pkt.id} pkt={pkt} nodes={viz.nodes} />
          ))}
        </svg>
      </div>

      {/* event log */}
      {viz.events?.length > 0 && (
        <div className={styles.events}>
          <div className={styles.eventsLabel}>Events</div>
          {viz.events.slice(-4).map((ev, i) => (
            <div key={i} className={`${styles.event} ${styles[`ev-${ev.type}`]}`}>
              <span className={styles.evDot} />
              {ev.msg}
            </div>
          ))}
        </div>
      )}

      {/* cache entries display */}
      {scenario === 'cache' && <CacheView nodes={viz.nodes} />}

      <div className={styles.bottom}>
        <CodePanel code={SD_CODE[scenario] || []} language="nginx/JS/shell" />
        <div className={styles.rightPanels}>
          <MetricsPanel metrics={metrics} />
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}

/* ── sub-components ── */

function EdgeLine({ edge, nodes, packets }) {
  const from = nodes.find((n) => n.id === edge.from);
  const to   = nodes.find((n) => n.id === edge.to);
  if (!from || !to) return null;

  const hasPacket = packets.some((p) => (p.from === edge.from && p.to === edge.to) || (p.from === edge.to && p.to === edge.from));
  const color = hasPacket ? 'var(--node-active)' : 'var(--border)';
  const marker = hasPacket ? 'url(#arrowhead-active)' : 'url(#arrowhead)';

  return (
    <line
      x1={from.x} y1={from.y}
      x2={to.x}   y2={to.y}
      stroke={color}
      strokeWidth={hasPacket ? 2 : 1}
      strokeDasharray={hasPacket ? '6 3' : 'none'}
      markerEnd={marker}
      className={hasPacket ? styles.edgeActive : styles.edge}
    />
  );
}

function DiagramNode({ node, scenario }) {
  const ns   = NODE_STYLE[node.type] || NODE_STYLE.server;
  const fill = NODE_STATE_OVERRIDE[node.state] || ns.fill;
  const isRaft = node.type === 'raft';
  const raftColor = isRaft ? (ROLE_COLOR[node.role] || 'var(--node-default)') : fill;
  const actualFill = isRaft ? raftColor : fill;

  const W = 100, H = 44;
  const rx = node.x - W / 2;
  const ry = node.y - H / 2;

  if (isRaft) {
    return (
      <g>
        <circle
          cx={node.x} cy={node.y} r={32}
          fill={`color-mix(in srgb, ${actualFill} 18%, transparent)`}
          stroke={actualFill}
          strokeWidth={node.role === 'leader' ? 3 : 1.5}
          className={node.role === 'leader' ? styles.nodeLeader : node.role === 'candidate' ? styles.nodeCandidate : ''}
        />
        <text x={node.x} y={node.y - 6} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--text-primary)" fontWeight="700">{node.label}</text>
        <text x={node.x} y={node.y + 10} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill={actualFill}>{node.role?.toUpperCase()}</text>
        {node.term > 0 && <text x={node.x} y={node.y + 23} textAnchor="middle" fontSize="8" fill="var(--text-muted)">T{node.term}</text>}
        {node.log?.length > 0 && (
          <text x={node.x} y={node.y + 34} textAnchor="middle" fontSize="7" fill={node.log[0].committed ? 'var(--pod-running)' : 'var(--node-comparing)'}>
            [{node.log.map((l) => l.cmd).join(',')}]
          </text>
        )}
      </g>
    );
  }

  return (
    <g>
      <rect
        x={rx} y={ry} width={W} height={H}
        rx={8} ry={8}
        fill={`color-mix(in srgb, ${actualFill} 15%, transparent)`}
        stroke={actualFill}
        strokeWidth={node.state === 'active' ? 2 : 1}
        className={node.state === 'active' ? styles.nodeActive : node.state === 'error' ? styles.nodeError : ''}
      />
      <text x={node.x} y={node.y - 5} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--text-primary)" fontWeight="700">
        {node.label?.split('\n')[0]}
      </text>
      {node.label?.includes('\n') && (
        <text x={node.x} y={node.y + 9} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-muted)">
          {node.label.split('\n')[1]}
        </text>
      )}
      {!node.label?.includes('\n') && (
        <text x={node.x} y={node.y + 10} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-muted)">
          {node.type.toUpperCase()}
        </text>
      )}
      {node.load > 0 && (
        <text x={node.x + W / 2 - 4} y={ry + 4} textAnchor="end" fontSize="8" fill="var(--node-comparing)">●</text>
      )}
      {node.healthy === false && (
        <text x={node.x} y={node.y - H / 2 - 4} textAnchor="middle" fontSize="10" fill="var(--pod-crash)">✕ DOWN</text>
      )}
      {node.cached && (
        <text x={node.x} y={node.y - H / 2 - 4} textAnchor="middle" fontSize="9" fill="var(--pod-running)">CACHED ✓</text>
      )}
    </g>
  );
}

function PacketDot({ pkt, nodes }) {
  const from = nodes.find((n) => n.id === pkt.from);
  const to   = nodes.find((n) => n.id === pkt.to);
  if (!from || !to) return null;

  const color = pkt.type === 'response' ? 'var(--pod-running)' : pkt.type === 'replication' ? 'var(--node-comparing)' : 'var(--node-active)';
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;

  return (
    <g>
      <circle cx={mx} cy={my} r={6} fill={color} opacity={0.9} className={styles.packet} />
      <text x={mx} y={my - 10} textAnchor="middle" fontSize="8" fill={color} fontFamily="var(--font-mono)">{pkt.label}</text>
    </g>
  );
}

function CacheView({ nodes }) {
  const cacheNode = nodes?.find((n) => n.type === 'cache');
  if (!cacheNode?.entries?.length) return null;
  return (
    <div className={styles.cacheView}>
      <span className={styles.cacheLabel}>Redis Entries</span>
      {cacheNode.entries.map((e, i) => (
        <div key={i} className={styles.cacheEntry}>
          <span className={styles.cacheKey}>{e.key}</span>
          <span className={styles.cacheTtl}>TTL {e.ttl}s</span>
        </div>
      ))}
      <span className={styles.cacheCapacity}>{cacheNode.entries.length}/{cacheNode.capacity} slots</span>
    </div>
  );
}

function buildMetrics(scenario, m) {
  if (scenario === 'lb') return [
    { label: 'Requests', value: m.requests || 0, max: 10, unit: '', color: 'var(--node-default)' },
    { label: 'S1',       value: m.s1       || 0, max: 5,  unit: '', color: 'var(--pod-running)' },
    { label: 'S2',       value: m.s2       || 0, max: 5,  unit: '', color: 'var(--node-comparing)' },
  ];
  if (scenario === 'cache') return [
    { label: 'Requests', value: m.requests || 0, max: 10,  unit: '',  color: 'var(--node-default)' },
    { label: 'Hit Rate', value: m.hitRate  || 0, max: 100, unit: '%', color: 'var(--pod-running)' },
    { label: 'Misses',   value: m.misses   || 0, max: 5,   unit: '',  color: 'var(--pod-crash)' },
  ];
  if (scenario === 'cdn') return [
    { label: 'Requests',  value: m.requests  || 0, max: 10,  unit: '',   color: 'var(--node-default)' },
    { label: 'Edge Hits', value: m.edgeHits  || 0, max: 10,  unit: '',   color: 'var(--pod-running)' },
    { label: 'Saved(ms)', value: m.savedMs   || 0, max: 1200, unit: 'ms', color: 'var(--node-comparing)' },
  ];
  if (scenario === 'raft') return [
    { label: 'Term',      value: m.term      || 0, max: 5, unit: '',  color: 'var(--node-default)' },
    { label: 'Committed', value: m.committed || 0, max: 5, unit: '',  color: 'var(--pod-running)' },
    { label: 'Nodes',     value: m.nodes     || 5, max: 5, unit: '',  color: 'var(--node-visited)' },
  ];
  return [];
}
