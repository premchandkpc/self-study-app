// ─── SVG Shared Style Block ──────────────────────────────────────────────────

export function SvgSharedStyles() {
  return (
    <style>{`
      .svg-node { transition: stroke-width 0.18s ease, filter 0.2s ease, opacity 0.2s ease; cursor: pointer; }
      .svg-node:hover { stroke-width: 2.5; }
      .svg-node:active { stroke-width: 3; }
      .svg-node-glow { filter: drop-shadow(0 0 8px var(--glow-c, var(--node-default))); }

      .svg-edge { transition: stroke 0.15s ease, stroke-width 0.15s ease; cursor: pointer; }
      .svg-edge:hover { stroke-width: 2.5; }

      .svg-pkt { animation: pkt-fly 0.6s ease-in-out both; }
      @keyframes pkt-fly {
        0%   { opacity: 0; }
        15%  { opacity: 1; }
        85%  { opacity: 1; }
        100% { opacity: 0; }
      }

      .svg-text-icon { font-size: 18px; }
      .svg-text-label { font-size: 10px; }
      .svg-text-sub { font-size: 8px; }

      .svg-layer { transition: opacity 0.3s ease, fill 0.3s ease; }
      .svg-layer:hover { opacity: 0.9; }
      .svg-layer-label { font-size: 9px; letter-spacing: 0.8px; }

      .svg-node-shape { transition: all 0.18s ease; }
    `}</style>
  );
}

// ─── Arrow Defs ──────────────────────────────────────────────────────────────

const COMMON_MARKER = { markerWidth: '8', markerHeight: '6', refX: '7', refY: '3', orient: 'auto' };

export function SvgArrowDefs({ prefix = 'svg' }) {
  return (
    <defs>
      <marker id={`${prefix}-arrow`} {...COMMON_MARKER}>
        <polygon points="0 0,8 3,0 6" fill="var(--border)" />
      </marker>
      <marker id={`${prefix}-arrow-active`} {...COMMON_MARKER}>
        <polygon points="0 0,8 3,0 6" fill="var(--node-active)" />
      </marker>
      <filter id={`${prefix}-glow`}>
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

// ─── Events List ────────────────────────────────────────────────────────────

const EVENT_STYLE = {
  ok:    'ev_ok',
  warn:  'ev_warn',
  error: 'ev_error',
  info:  'ev_info',
};

export function SvgEventsList({ events = [], max = 5, styles = {} }) {
  if (!events.length) return null;
  return (
    <div className={styles.events}>
      {events.slice(-max).map((ev, i) => {
        const cls = EVENT_STYLE[ev.type] || '';
        return (
          <div key={i} className={`${styles.event} ${styles[cls] || ''}`}>
            <span className={styles.evDot} />
            {ev.msg}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tooltips ───────────────────────────────────────────────────────────────

const HIDDEN_NODE_KEYS = ['id', 'label', 'type', 'x', 'y', 'state', 'desc', 'healthy', 'icon'];

export function SvgNodeTooltip({ node, nodeMeta = {}, styles = {} }) {
  const meta = nodeMeta[node?.type] || nodeMeta.default || {};
  const icon = node?.icon || meta.icon || '';
  const extras = Object.entries(node || {})
    .filter(([k]) => !HIDDEN_NODE_KEYS.includes(k))
    .filter(([, v]) => v !== undefined && v !== null && typeof v !== 'object');

  return (
    <>
      <div className={styles.ttTitle}>{icon} {node?.label}</div>
      {node?.type && <div className={styles.ttRow}><b>Type</b> {node.type}</div>}
      {node?.state && <div className={styles.ttRow}><b>State</b> {node.state}</div>}
      {node?.desc && <div className={styles.ttDesc}>{node.desc}</div>}
      {node?.healthy === false && <div className={styles.ttWarn}>{'\u26A0'} Node is DOWN</div>}
      {extras.map(([k, v]) => (
        <div key={k} className={styles.ttRow}><b>{k}</b> {String(v)}</div>
      ))}
    </>
  );
}

export function SvgEdgeTooltip({ edge, styles = {} }) {
  if (!edge) return null;
  return (
    <>
      <div className={styles.ttTitle}>{edge.from} {'\u2192'} {edge.to}</div>
      {edge.protocol && <div className={styles.ttRow}><b>Protocol</b> {edge.protocol}</div>}
      {edge.label && <div className={styles.ttRow}><b>Label</b> {edge.label}</div>}
      {edge.desc && <div className={styles.ttDesc}>{edge.desc}</div>}
    </>
  );
}

export function SvgFlowTooltip({ flow, styles = {} }) {
  if (!flow) return null;
  return (
    <>
      <div className={styles.ttTitle}>{flow.from} {'\u2192'} {flow.to}</div>
      {flow.protocol && <div className={styles.ttRow}><b>Protocol</b> {flow.protocol}</div>}
      {flow.label && <div className={styles.ttRow}><b>Label</b> {flow.label}</div>}
      {flow.direction && <div className={styles.ttRow}><b>Direction</b> {flow.direction}</div>}
      {flow.desc && <div className={styles.ttDesc}>{flow.desc}</div>}
    </>
  );
}

// ─── SVG Node/Box/Edge/Packet renderers ─────────────────────────────────────

export function SvgNodeRect({ node, nodeMeta = {}, stateColors = {}, nodeW = 110, nodeH = 46, hovered, prefix = 'svg' }) {
  const meta = nodeMeta[node?.type] || nodeMeta.default || {};
  const fill = stateColors[node?.state] || meta.fill || 'var(--node-default)';
  const rx = node.x - nodeW / 2;
  const ry = node.y - nodeH / 2;
  const isHover = hovered || node?.state === 'active';

  return (
    <g className="svg-node" filter={isHover ? `url(#${prefix}-glow)` : undefined}>
      <rect x={rx} y={ry} width={nodeW} height={nodeH} rx={8}
        fill={`color-mix(in srgb, ${fill} 18%, transparent)`} stroke={fill}
        strokeWidth={isHover ? 2.5 : 1.5}
        opacity={node?.healthy === false ? 0.45 : 1} />
      <text x={node.x} y={node.y - 7} textAnchor="middle" className="svg-text-icon"
        pointerEvents="none">{meta.icon}</text>
      <text x={node.x} y={node.y + 9} textAnchor="middle" className="svg-text-label"
        fontFamily="var(--font-mono)" fill="var(--text-primary)" fontWeight="700" pointerEvents="none">
        {node?.label?.split('\n')[0]}
      </text>
      <text x={node.x} y={node.y + 19} textAnchor="middle" className="svg-text-sub"
        fontFamily="var(--font-mono)" fill="var(--text-muted)" pointerEvents="none">
        {(node?.type || '').toUpperCase()}
      </text>
      {node?.healthy === false && (
        <text x={node.x} y={ry - 4} textAnchor="middle" fontSize="10" fill="var(--pod-crash)" pointerEvents="none">
          {'\u2715'} DOWN
        </text>
      )}
    </g>
  );
}

export function SvgBoxRect({ box, boxMeta = {}, stateColors = {}, boxW = 120, boxH = 50, hovered, prefix = 'svg' }) {
  const meta = boxMeta[box?.type] || boxMeta.default || {};
  const fill = stateColors[box?.state] || meta.fill || 'var(--node-default)';
  const rx = box.x - boxW / 2;
  const ry = box.y - boxH / 2;
  const isHover = hovered || box?.state === 'active' || box?.state === 'running';

  return (
    <g className="svg-node" filter={isHover ? `url(#${prefix}-glow)` : undefined}>
      <rect x={rx} y={ry} width={boxW} height={boxH} rx={8}
        fill={`color-mix(in srgb, ${fill} 18%, transparent)`} stroke={fill}
        strokeWidth={isHover ? 2.5 : 1.5} />
      <text x={box.x} y={box.y - 7} textAnchor="middle" className="svg-text-icon"
        pointerEvents="none">{meta.icon}</text>
      <text x={box.x} y={box.y + 9} textAnchor="middle" className="svg-text-label"
        fontFamily="var(--font-mono)" fill="var(--text-primary)" fontWeight="700" pointerEvents="none">
        {box?.label}
      </text>
      {box?.value !== undefined && (
        <text x={box.x} y={box.y + 20} textAnchor="middle" className="svg-text-sub"
          fontFamily="var(--font-mono)" fill={fill} pointerEvents="none">
          {String(box.value)}
        </text>
      )}
      {box?.state && (
        <text x={box.x} y={box.y + (box?.value !== undefined ? 30 : 19)} textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill={fill} pointerEvents="none">
          {box.state.toUpperCase()}
        </text>
      )}
    </g>
  );
}

export function SvgEdgeLine({ edge, fromPos, toPos, active, edgePrefix = 'svg', showLabel = true }) {
  const mx = (fromPos.x + toPos.x) / 2;
  const my = (fromPos.y + toPos.y) / 2;
  const stroke = active ? 'var(--node-active)' : 'var(--edge-default)';
  const dash = active ? '7 3' : edge?.async ? '5 4' : 'none';

  return (
    <>
      <line className="svg-edge" x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y}
        stroke={stroke} strokeWidth={active ? 2.5 : 1.5}
        strokeDasharray={dash}
        strokeOpacity={edge?.async && !active ? 0.55 : 1}
        markerEnd={active ? `url(#${edgePrefix}-arrow-active)` : `url(#${edgePrefix}-arrow)`} />
      <line x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y} stroke="transparent" strokeWidth={16} />
      {showLabel && (edge?.label || edge?.protocol) && (
        <text x={mx} y={my - 8} textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)"
          fill={active ? 'var(--node-active)' : 'var(--text-muted)'}
          fontWeight={active ? 700 : 400}
          pointerEvents="none">
          {edge.protocol || edge.label}
        </text>
      )}
    </>
  );
}

export function SvgPacketDot({ fromPos, toPos, pkt, pktColors = {} }) {
  const mx = (fromPos.x + toPos.x) / 2;
  const my = (fromPos.y + toPos.y) / 2;
  const color = pktColors[pkt?.type] || pktColors.request || 'var(--node-active)';

  return (
    <g className="svg-pkt">
      <circle cx={mx} cy={my} r={7} fill={color} opacity={0.95} filter="url(#svg-glow)" />
      {pkt?.label && (
        <text x={mx} y={my - 12} textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)"
          fill={color} fontWeight="700" pointerEvents="none">
          {pkt.label}
        </text>
      )}
    </g>
  );
}
