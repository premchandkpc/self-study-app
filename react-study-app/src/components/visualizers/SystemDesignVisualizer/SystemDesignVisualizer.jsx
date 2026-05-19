import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { SCENARIOS } from './sd-engine';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import ResultPanel from '../../shared/ResultPanel/ResultPanel';
import styles from './SystemDesignVisualizer.module.css';

const NODE_STYLE = {
  client:  { fill: 'var(--node-default)',    label: '👤' },
  server:  { fill: 'var(--node-visited)',    label: '🖥' },
  lb:      { fill: 'var(--node-comparing)', label: '⚖' },
  cache:   { fill: 'var(--node-blocked)',   label: '💾' },
  db:      { fill: 'var(--pod-crash)',      label: '🗄' },
  cdn:     { fill: 'var(--kafka-producer)', label: '🌐' },
  raft:    { fill: 'var(--node-default)',   label: '●' },
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

const SVG_W = 700;
const SVG_H = 380;

export default function SystemDesignVisualizer() {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(SCENARIOS);

  if (!viz) return null;

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={SCENARIOS} active={activeId} onChange={select} />

      <div className={styles.svgWrap}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className={styles.svg} preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--border)" />
            </marker>
            <marker id="arrowhead-active" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--node-active)" />
            </marker>
          </defs>

          {(viz.edges || []).map((edge) => (
            <EdgeLine key={`${edge.from}-${edge.to}`} edge={edge} nodes={viz.nodes} packets={viz.packets || []} />
          ))}

          {(viz.nodes || []).map((n) => (
            <DiagramNode key={n.id} node={n} />
          ))}

          {(viz.packets || []).map((pkt) => (
            <PacketDot key={pkt.id} pkt={pkt} nodes={viz.nodes} />
          ))}
        </svg>
      </div>

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

      {activeId === 'cache' && <CacheView nodes={viz.nodes} />}

      <div className={styles.bottom}>
        <CodePanel code={active.code} language={active.language} />
        <div className={styles.rightPanels}>
          <MetricsPanel metrics={metrics} />
          <ResultPanel result={viz?.result} />
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}

function EdgeLine({ edge, nodes, packets }) {
  const from = nodes.find((n) => n.id === edge.from);
  const to   = nodes.find((n) => n.id === edge.to);
  if (!from || !to) return null;

  const hasPacket = packets.some((p) =>
    (p.from === edge.from && p.to === edge.to) || (p.from === edge.to && p.to === edge.from)
  );
  return (
    <line
      x1={from.x} y1={from.y} x2={to.x} y2={to.y}
      stroke={hasPacket ? 'var(--node-active)' : 'var(--border)'}
      strokeWidth={hasPacket ? 2 : 1}
      strokeDasharray={hasPacket ? '6 3' : 'none'}
      markerEnd={hasPacket ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
      className={hasPacket ? styles.edgeActive : styles.edge}
    />
  );
}

function DiagramNode({ node }) {
  const ns        = NODE_STYLE[node.type] || NODE_STYLE.server;
  const fill      = NODE_STATE_OVERRIDE[node.state] || ns.fill;
  const isRaft    = node.type === 'raft';
  const raftColor = isRaft ? (ROLE_COLOR[node.role] || 'var(--node-default)') : fill;
  const color     = isRaft ? raftColor : fill;

  const W = 100, H = 44;
  const rx = node.x - W / 2;
  const ry = node.y - H / 2;

  if (isRaft) {
    return (
      <g>
        <circle
          cx={node.x} cy={node.y} r={32}
          fill={`color-mix(in srgb, ${color} 18%, transparent)`}
          stroke={color}
          strokeWidth={node.role === 'leader' ? 3 : 1.5}
          className={node.role === 'leader' ? styles.nodeLeader : node.role === 'candidate' ? styles.nodeCandidate : ''}
        />
        <text x={node.x} y={node.y - 6} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--text-primary)" fontWeight="700">{node.label}</text>
        <text x={node.x} y={node.y + 10} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill={color}>{node.role?.toUpperCase()}</text>
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
        x={rx} y={ry} width={W} height={H} rx={8}
        fill={`color-mix(in srgb, ${color} 15%, transparent)`}
        stroke={color}
        strokeWidth={node.state === 'active' ? 2 : 1}
        className={node.state === 'active' ? styles.nodeActive : node.state === 'error' ? styles.nodeError : ''}
      />
      <text x={node.x} y={node.y - 5} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill="var(--text-primary)" fontWeight="700">
        {node.label?.split('\n')[0]}
      </text>
      {node.label?.includes('\n') ? (
        <text x={node.x} y={node.y + 9} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-muted)">
          {node.label.split('\n')[1]}
        </text>
      ) : (
        <text x={node.x} y={node.y + 10} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-muted)">
          {node.type.toUpperCase()}
        </text>
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

  const color =
    pkt.type === 'response'    ? 'var(--pod-running)' :
    pkt.type === 'replication' ? 'var(--node-comparing)' :
    'var(--node-active)';

  return (
    <g>
      <circle cx={(from.x + to.x) / 2} cy={(from.y + to.y) / 2} r={6} fill={color} opacity={0.9} className={styles.packet} />
      <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 10} textAnchor="middle" fontSize="8" fill={color} fontFamily="var(--font-mono)">{pkt.label}</text>
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
