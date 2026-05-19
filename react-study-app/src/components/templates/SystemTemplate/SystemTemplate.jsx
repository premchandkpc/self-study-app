import { useState } from 'react';
import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import styles from './SystemTemplate.module.css';

const SVG_W = 700;
const SVG_H = 380;

const NODE_BASE = {
  client:  { fill: 'var(--node-default)',    icon: '👤' },
  server:  { fill: 'var(--node-visited)',    icon: '🖥' },
  lb:      { fill: 'var(--node-comparing)', icon: '⚖' },
  cache:   { fill: 'var(--node-blocked)',   icon: '💾' },
  db:      { fill: 'var(--pod-crash)',      icon: '🗄' },
  cdn:     { fill: 'var(--kafka-producer)', icon: '🌐' },
  queue:   { fill: 'var(--node-comparing)', icon: '📨' },
  worker:  { fill: 'var(--node-visited)',   icon: '⚙' },
  pod:     { fill: 'var(--pod-running)',    icon: '📦' },
  broker:  { fill: 'var(--kafka-producer)', icon: '📡' },
  default: { fill: 'var(--node-default)',   icon: '●' },
};

const STATE_COLOR = {
  active: 'var(--node-active)',
  ok:     'var(--pod-running)',
  error:  'var(--pod-crash)',
  warn:   'var(--node-comparing)',
};

const PKT_COLOR = {
  request:     'var(--node-active)',
  response:    'var(--pod-running)',
  replication: 'var(--node-comparing)',
  event:       'var(--kafka-producer)',
};

/**
 * SystemTemplate — generic system-design visualizer.
 *
 * Each scenario step shape:
 *   nodes:   [{ id, label, type, x, y, state?, desc?, healthy?, [extra props] }]
 *   edges:   [{ from, to, label?, protocol?, state? }]
 *   packets: [{ id, from, to, label?, type? }]
 *   events:  [{ type: 'ok'|'warn'|'error', msg }]
 *   metrics: {}
 */
export default function SystemTemplate({ scenarios }) {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(scenarios);
  const [hovered, setHovered] = useState(null); // { kind:'node'|'edge', data }

  if (!viz) return null;

  const nodes   = viz.nodes   || [];
  const edges   = viz.edges   || [];
  const packets = viz.packets || [];
  const events  = viz.events  || [];

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={scenarios} active={activeId} onChange={select} />

      <NarrationPanel />

      <div className={styles.diagramWrap}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className={styles.svg}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker id="st-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0,8 3,0 6" fill="var(--border)" />
            </marker>
            <marker id="st-arrow-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0,8 3,0 6" fill="var(--node-active)" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((edge, i) => (
            <EdgeSvg
              key={i}
              edge={edge}
              nodes={nodes}
              packets={packets}
              hovered={hovered?.kind === 'edge' && hovered.data === edge}
              onHover={(d) => setHovered(d ? { kind: 'edge', data: edge } : null)}
            />
          ))}

          {/* Nodes */}
          {nodes.map((n) => (
            <NodeSvg
              key={n.id}
              node={n}
              hovered={hovered?.kind === 'node' && hovered.data === n}
              onHover={(d) => setHovered(d ? { kind: 'node', data: n } : null)}
            />
          ))}

          {/* Packets */}
          {packets.map((pkt) => (
            <PacketSvg key={pkt.id} pkt={pkt} nodes={nodes} />
          ))}
        </svg>

        {/* Hover tooltip */}
        {hovered && (
          <div className={styles.tooltip}>
            {hovered.kind === 'node' && <NodeTooltip node={hovered.data} />}
            {hovered.kind === 'edge' && <EdgeTooltip edge={hovered.data} />}
          </div>
        )}
      </div>

      {/* Events log */}
      {events.length > 0 && (
        <div className={styles.events}>
          {events.slice(-5).map((ev, i) => (
            <div key={i} className={`${styles.event} ${styles[`ev${ev.type}`]}`}>
              <span className={styles.evDot} />
              {ev.msg}
            </div>
          ))}
        </div>
      )}

      {metrics.length > 0 && <MetricsPanel metrics={metrics} />}

      <StepControls />
    </div>
  );
}

// ─── SVG sub-components ──────────────────────────────────────────────────────

function NodeSvg({ node, hovered, onHover }) {
  const base  = NODE_BASE[node.type] || NODE_BASE.default;
  const fill  = STATE_COLOR[node.state] || base.fill;
  const W = 110, H = 46;
  const rx = node.x - W / 2;
  const ry = node.y - H / 2;

  return (
    <g
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <rect
        x={rx} y={ry} width={W} height={H} rx={8}
        fill={`color-mix(in srgb, ${fill} 18%, transparent)`}
        stroke={fill}
        strokeWidth={hovered || node.state === 'active' ? 2.5 : 1.5}
        opacity={node.healthy === false ? 0.45 : 1}
      />
      <text x={node.x} y={node.y - 5}
        textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)"
        fill="var(--text-primary)" fontWeight="700">
        {base.icon} {node.label?.split('\n')[0]}
      </text>
      <text x={node.x} y={node.y + 10}
        textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)"
        fill="var(--text-muted)">
        {(node.type || '').toUpperCase()}
      </text>
      {node.healthy === false && (
        <text x={node.x} y={ry - 4} textAnchor="middle" fontSize="10" fill="var(--pod-crash)">✕ DOWN</text>
      )}
    </g>
  );
}

function EdgeSvg({ edge, nodes, packets, hovered, onHover }) {
  const from = nodes.find((n) => n.id === edge.from);
  const to   = nodes.find((n) => n.id === edge.to);
  if (!from || !to) return null;

  const active = hovered || packets.some(
    (p) => (p.from === edge.from && p.to === edge.to) ||
            (p.from === edge.to   && p.to === edge.from)
  );
  const stroke = active ? 'var(--node-active)' : 'var(--border)';
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;

  return (
    <g
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <line
        x1={from.x} y1={from.y} x2={to.x} y2={to.y}
        stroke={stroke} strokeWidth={active ? 2 : 1}
        strokeDasharray={active ? '6 3' : 'none'}
        markerEnd={active ? 'url(#st-arrow-active)' : 'url(#st-arrow)'}
      />
      {/* Hover hit area */}
      <line
        x1={from.x} y1={from.y} x2={to.x} y2={to.y}
        stroke="transparent" strokeWidth={14}
      />
      {(edge.label || edge.protocol) && (
        <text x={mx} y={my - 6}
          textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)"
          fill={active ? 'var(--node-active)' : 'var(--text-muted)'}>
          {edge.protocol || edge.label}
        </text>
      )}
    </g>
  );
}

function PacketSvg({ pkt, nodes }) {
  const from = nodes.find((n) => n.id === pkt.from);
  const to   = nodes.find((n) => n.id === pkt.to);
  if (!from || !to) return null;

  const color = PKT_COLOR[pkt.type] || PKT_COLOR.request;
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;

  return (
    <g>
      <circle cx={mx} cy={my} r={7} fill={color} opacity={0.9} />
      {pkt.label && (
        <text x={mx} y={my - 11}
          textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill={color}>
          {pkt.label}
        </text>
      )}
    </g>
  );
}

// ─── Tooltips ────────────────────────────────────────────────────────────────

function NodeTooltip({ node }) {
  const base = NODE_BASE[node.type] || NODE_BASE.default;
  return (
    <>
      <div className={styles.ttTitle}>{base.icon} {node.label}</div>
      {node.type && <div className={styles.ttRow}><b>Type</b> {node.type}</div>}
      {node.state && <div className={styles.ttRow}><b>State</b> {node.state}</div>}
      {node.desc && <div className={styles.ttDesc}>{node.desc}</div>}
      {node.healthy === false && <div className={styles.ttWarn}>⚠ Node is DOWN</div>}
      {/* Render any extra numeric props as key=value */}
      {Object.entries(node)
        .filter(([k]) => !['id','label','type','x','y','state','desc','healthy'].includes(k))
        .filter(([, v]) => v !== undefined && v !== null && typeof v !== 'object')
        .map(([k, v]) => (
          <div key={k} className={styles.ttRow}><b>{k}</b> {String(v)}</div>
        ))}
    </>
  );
}

function EdgeTooltip({ edge }) {
  return (
    <>
      <div className={styles.ttTitle}>{edge.from} → {edge.to}</div>
      {edge.protocol && <div className={styles.ttRow}><b>Protocol</b> {edge.protocol}</div>}
      {edge.label    && <div className={styles.ttRow}><b>Label</b>    {edge.label}</div>}
      {edge.desc     && <div className={styles.ttDesc}>{edge.desc}</div>}
    </>
  );
}
