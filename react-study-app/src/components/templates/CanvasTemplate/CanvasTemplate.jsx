import { useState, useRef, useEffect } from 'react';
import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { useSimulation } from '../../../core/context/SimulationContext';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import styles from './CanvasTemplate.module.css';

const NODE_META = {
  client:  { color: 'var(--node-default)',    icon: '📱',  shape: 'circle'   },
  server:  { color: 'var(--node-visited)',    icon: '🖥',   shape: 'rect'     },
  lb:      { color: 'var(--node-comparing)', icon: '⚖️',  shape: 'diamond'  },
  cache:   { color: 'var(--node-blocked)',   icon: '⚡',   shape: 'hexagon'  },
  redis:   { color: 'var(--node-blocked)',   icon: '⚡',   shape: 'hexagon'  },
  db:      { color: 'var(--pod-crash)',      icon: '🗃️',  shape: 'cylinder' },
  cdn:     { color: 'var(--kafka-producer)', icon: '🌐',   shape: 'cloud'    },
  queue:   { color: 'var(--node-comparing)', icon: '📬',   shape: 'rect'     },
  worker:  { color: 'var(--node-visited)',   icon: '⚙️',  shape: 'rect'     },
  pod:     { color: 'var(--pod-running)',    icon: '📦',   shape: 'rect'     },
  broker:  { color: 'var(--kafka-producer)', icon: '📬',   shape: 'rect'     },
  gateway: { color: 'var(--node-active)',    icon: '🛡️',  shape: 'hexagon'  },
  service: { color: 'var(--node-visited)',   icon: '⚙️',  shape: 'rect'     },
  default: { color: 'var(--node-default)',   icon: '●',    shape: 'rect'     },
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
  default:     'var(--node-active)',
};

const NODE_W   = 108;
const NODE_H   = 54;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 3.5;
const INIT_PAN = { x: 60, y: 50 };

export default function CanvasTemplate({ scenarios }) {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(scenarios);
  const { state: simState } = useSimulation();

  const canvasRef    = useRef(null);
  const wheelHandler = useRef(null);
  const needsFitRef  = useRef(true);
  const fitFnRef     = useRef(null);

  const [pan,       setPan]       = useState(INIT_PAN);
  const [scale,     setScale]     = useState(1);
  const [positions, setPositions] = useState({});
  const [dragging,  setDragging]  = useState(null);
  const [panning,   setPanning]   = useState(null);
  const [hovered,   setHovered]   = useState(null);
  const [animKey,   setAnimKey]   = useState(0);

  useEffect(() => { setAnimKey(k => k + 1); }, [simState.currentStep]);
  useEffect(() => { setPositions({}); needsFitRef.current = true; }, [activeId]);
  // auto-fit when first viz snapshot loads for a scenario
  useEffect(() => {
    if (!viz || !needsFitRef.current) return;
    needsFitRef.current = false;
    fitFnRef.current?.();
  }, [viz]); // eslint-disable-line react-hooks/exhaustive-deps

  // non-passive wheel listener so preventDefault works
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e) => wheelHandler.current?.(e);
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  if (!viz) return null;

  const nodes   = viz.nodes   || [];
  const edges   = viz.edges   || [];
  const packets = viz.packets || [];
  const events  = viz.events  || [];

  function nodePos(n) {
    return positions[n.id] ?? { x: n.x, y: n.y };
  }

  function fitToContent() {
    if (!nodes.length || !canvasRef.current) return;
    const { width: cw, height: ch } = canvasRef.current.getBoundingClientRect();
    const pad = 52;
    const xs  = nodes.map(n => nodePos(n).x);
    const ys  = nodes.map(n => nodePos(n).y);
    const x0  = Math.min(...xs) - NODE_W / 2 - 10;
    const y0  = Math.min(...ys) - NODE_H / 2 - 10;
    const fw  = Math.max(...xs) + NODE_W / 2 + 10 - x0;
    const fh  = Math.max(...ys) + NODE_H / 2 + 10 - y0;
    const s   = Math.min((cw - pad * 2) / fw, (ch - pad * 2) / fh, 1.6);
    setPan({ x: (cw - fw * s) / 2 - x0 * s, y: (ch - fh * s) / 2 - y0 * s });
    setScale(s);
  }
  fitFnRef.current = fitToContent;

  function handleWheel(e) {
    e.preventDefault();
    const rect   = canvasRef.current.getBoundingClientRect();
    const mx     = e.clientX - rect.left;
    const my     = e.clientY - rect.top;
    const delta  = e.deltaY * (e.deltaMode === 1 ? 20 : 1);
    const factor = Math.pow(0.999, delta);
    setScale(prev => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * factor));
      const ratio = next / prev;
      setPan(p => ({ x: mx + (p.x - mx) * ratio, y: my + (p.y - my) * ratio }));
      return next;
    });
  }
  wheelHandler.current = handleWheel;

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    const nodeEl = e.target.closest('[data-nodeid]');
    if (nodeEl) {
      const nodeId = nodeEl.dataset.nodeid;
      const node   = nodes.find(n => n.id === nodeId);
      if (!node) return;
      const pos = nodePos(node);
      setDragging({ nodeId, startMX: e.clientX, startMY: e.clientY, origX: pos.x, origY: pos.y });
      return;
    }
    setPanning({ startMX: e.clientX, startMY: e.clientY, origPan: { ...pan } });
  }

  function handleMouseMove(e) {
    if (dragging) {
      const dx = (e.clientX - dragging.startMX) / scale;
      const dy = (e.clientY - dragging.startMY) / scale;
      setPositions(p => ({ ...p, [dragging.nodeId]: { x: dragging.origX + dx, y: dragging.origY + dy } }));
      return;
    }
    if (panning) {
      setPan({
        x: panning.origPan.x + (e.clientX - panning.startMX),
        y: panning.origPan.y + (e.clientY - panning.startMY),
      });
    }
  }

  function handleMouseUp() {
    setDragging(null);
    setPanning(null);
  }

  function handleNodeHover(kind, data, e) {
    if (!e) { setHovered(null); return; }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHovered({ kind, data, sx: e.clientX - rect.left, sy: e.clientY - rect.top });
  }

  const dotSize = 28 * scale;
  const dotX    = ((pan.x % dotSize) + dotSize) % dotSize;
  const dotY    = ((pan.y % dotSize) + dotSize) % dotSize;
  const pktDur  = Math.max(0.35, (simState.speed || 800) * 0.0009);

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={scenarios} active={activeId} onChange={select} />
      <NarrationPanel />

      <div
        ref={canvasRef}
        className={styles.canvas}
        style={{
          backgroundSize:     `${dotSize}px ${dotSize}px`,
          backgroundPosition: `${dotX}px ${dotY}px`,
          cursor: panning ? 'grabbing' : dragging ? 'move' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg className={styles.svg}>
          <defs>
            <marker id="ct-arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0,8 3,0 6" fill="var(--border)" />
            </marker>
            <marker id="ct-arr-on" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0,8 3,0 6" fill="var(--node-active)" />
            </marker>
            <filter id="pkt-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
            {/* ── Edges ── */}
            {edges.map((edge, i) => {
              const fn = nodes.find(n => n.id === edge.from);
              const tn = nodes.find(n => n.id === edge.to);
              if (!fn || !tn) return null;
              const fp  = nodePos(fn);
              const tp  = nodePos(tn);
              const hot = packets.some(
                p => (p.from === edge.from && p.to === edge.to) ||
                     (p.from === edge.to   && p.to === edge.from)
              );
              const isAsync  = !!edge.async;
              const stroke   = hot ? 'var(--node-active)' : isAsync ? 'var(--kafka-producer)' : 'var(--border)';
              const dashArr  = hot ? '8 3' : isAsync ? '6 4' : 'none';
              const mx = (fp.x + tp.x) / 2;
              const my = (fp.y + tp.y) / 2;
              return (
                <g key={i} style={{ cursor: 'pointer' }}
                  onMouseEnter={ev => handleNodeHover('edge', edge, ev)}
                  onMouseLeave={() => handleNodeHover(null, null, null)}
                >
                  <line x1={fp.x} y1={fp.y} x2={tp.x} y2={tp.y}
                    stroke={stroke}
                    strokeWidth={hot ? 2 : 1.5}
                    strokeDasharray={dashArr}
                    strokeOpacity={isAsync && !hot ? 0.6 : 1}
                    markerEnd={hot ? 'url(#ct-arr-on)' : 'url(#ct-arr)'}
                  />
                  {/* wide hit area */}
                  <line x1={fp.x} y1={fp.y} x2={tp.x} y2={tp.y}
                    stroke="transparent" strokeWidth={16} />
                  {(edge.label || edge.protocol) && (
                    <text x={mx} y={my - 8}
                      textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)"
                      fill={hot ? 'var(--node-active)' : 'var(--text-muted)'}>
                      {edge.protocol || edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* ── Nodes ── */}
            {nodes.map(n => {
              const pos  = nodePos(n);
              const meta = NODE_META[n.type] || NODE_META.default;
              const fill = STATE_COLOR[n.state] || meta.color;
              const isDrag = dragging?.nodeId === n.id;
              return (
                <g key={n.id}
                  data-nodeid={n.id}
                  style={{ cursor: isDrag ? 'move' : 'pointer', userSelect: 'none' }}
                  onMouseEnter={ev => handleNodeHover('node', n, ev)}
                  onMouseLeave={() => handleNodeHover(null, null, null)}
                  onMouseDown={e => e.stopPropagation()}
                >
                  <NodeShape
                    type={n.type} cx={pos.x} cy={pos.y} w={NODE_W} h={NODE_H}
                    fill={`color-mix(in srgb, ${fill} 18%, transparent)`}
                    stroke={fill}
                    strokeWidth={isDrag || n.state === 'active' ? 2.5 : 1.5}
                    opacity={n.healthy === false ? 0.38 : 1}
                  />
                  {/* icon — large, centered above midline */}
                  <text x={pos.x} y={pos.y - 3}
                    textAnchor="middle" fontSize="18" dominantBaseline="middle"
                    pointerEvents="none">
                    {n.icon ?? meta.icon}
                  </text>
                  {/* label — below icon */}
                  <text x={pos.x} y={pos.y + 17}
                    textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)"
                    fill="var(--text-primary)" fontWeight="600" pointerEvents="none">
                    {(n.label || '').split('\n')[0]}
                  </text>
                  {n.healthy === false && (
                    <text x={pos.x} y={pos.y - NODE_H / 2 - 6}
                      textAnchor="middle" fontSize="10" fill="var(--pod-crash)" pointerEvents="none">
                      ✕ DOWN
                    </text>
                  )}
                  {isDrag && (
                    <rect x={pos.x - NODE_W / 2 - 4} y={pos.y - NODE_H / 2 - 4}
                      width={NODE_W + 8} height={NODE_H + 8} rx={12}
                      fill="none" stroke="var(--node-active)"
                      strokeWidth={1} strokeDasharray="4 3" opacity={0.6}
                    />
                  )}
                </g>
              );
            })}

            {/* ── Packets ── */}
            {packets.map(pkt => {
              const fn = nodes.find(n => n.id === pkt.from);
              const tn = nodes.find(n => n.id === pkt.to);
              if (!fn || !tn) return null;
              return (
                <PacketDot
                  key={`${animKey}-${pkt.id}`}
                  from={nodePos(fn)} to={nodePos(tn)}
                  color={PKT_COLOR[pkt.type] || PKT_COLOR.default}
                  label={pkt.label} dur={pktDur}
                />
              );
            })}
          </g>
        </svg>

        {/* ── Hover tooltip ── */}
        {hovered && (() => {
          const cw = canvasRef.current?.clientWidth ?? 800;
          const ch = canvasRef.current?.clientHeight ?? 400;
          const tx = Math.min(hovered.sx + 18, cw - 270);
          const ty = Math.min(hovered.sy + 12, ch - 140);
          return (
            <div className={styles.tooltip} style={{ left: tx, top: ty }}>
              {hovered.kind === 'node' && <NodeTooltip node={hovered.data} />}
              {hovered.kind === 'edge' && <EdgeTooltip edge={hovered.data} />}
            </div>
          );
        })()}

        {/* ── Zoom controls ── */}
        <div className={styles.zoomBar}>
          <button className={styles.zBtn} title="Zoom in"
            onClick={() => setScale(s => Math.min(MAX_ZOOM, +(s * 1.3).toFixed(2)))}>+</button>
          <span className={styles.zLabel}>{Math.round(scale * 100)}%</span>
          <button className={styles.zBtn} title="Zoom out"
            onClick={() => setScale(s => Math.max(MIN_ZOOM, +(s / 1.3).toFixed(2)))}>−</button>
          <button className={styles.zBtn} title="Fit to content"
            onClick={fitToContent}>⊞</button>
        </div>

        {/* ── Legend ── */}
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="var(--border)" strokeWidth="2"/><polygon points="16,1 22,4 16,7" fill="var(--border)"/></svg>
            Sync
          </span>
          <span className={styles.legendItem}>
            <svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="var(--kafka-producer)" strokeWidth="2" strokeDasharray="5 3"/><polygon points="16,1 22,4 16,7" fill="var(--kafka-producer)"/></svg>
            Async
          </span>
          <span className={styles.legendHint}>Drag nodes · Scroll zoom · Pan bg</span>
        </div>
      </div>

      {events.length > 0 && (
        <div className={styles.events}>
          {events.slice(-5).map((ev, i) => (
            <div key={i} className={`${styles.event} ${styles['ev_' + ev.type] || ''}`}>
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

// ── Node shapes ───────────────────────────────────────────────────────────────

function NodeShape({ type, cx, cy, w, h, fill, stroke, strokeWidth, opacity }) {
  const p = { fill, stroke, strokeWidth };
  switch (type) {
    case 'client': {
      const r = Math.min(w, h) / 2 + 2;
      return <circle cx={cx} cy={cy} r={r} opacity={opacity} {...p} />;
    }
    case 'db': {
      const ey = h * 0.18;
      return (
        <g opacity={opacity}>
          <rect x={cx - w / 2} y={cy - h / 2 + ey} width={w} height={h - ey * 2} fill={fill} stroke="none" />
          <rect x={cx - w / 2} y={cy - h / 2 + ey} width={w} height={h - ey * 2} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
          <ellipse cx={cx} cy={cy - h / 2 + ey} rx={w / 2} ry={ey} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <ellipse cx={cx} cy={cy + h / 2 - ey} rx={w / 2} ry={ey} fill={fill} stroke="none" />
          <ellipse cx={cx} cy={cy - h / 2 + ey} rx={w / 2} ry={ey} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      );
    }
    case 'lb': {
      const hw = w * 0.54, hh = h * 0.74;
      const pts = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
      return <polygon points={pts} opacity={opacity} {...p} />;
    }
    case 'cache':
    case 'redis':
    case 'gateway': {
      const r2 = Math.min(w, h) * 0.46;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        return `${cx + r2 * Math.cos(a)},${cy + r2 * Math.sin(a)}`;
      }).join(' ');
      return <polygon points={pts} opacity={opacity} {...p} />;
    }
    case 'cdn': {
      const bumpR = h / 2.6;
      return (
        <g opacity={opacity}>
          <rect x={cx - w / 2} y={cy - h / 2 + 5} width={w} height={h - 5} rx={h / 2 - 3} fill={fill} stroke="none" />
          <rect x={cx - w / 2} y={cy - h / 2 + 5} width={w} height={h - 5} rx={h / 2 - 3} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx={cx - w / 4} cy={cy - h / 2 + 8} r={bumpR} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx={cx}         cy={cy - h / 2 + 3} r={bumpR * 1.15} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx={cx + w / 4} cy={cy - h / 2 + 8} r={bumpR} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      );
    }
    default:
      return <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={8} opacity={opacity} {...p} />;
  }
}

// ── Animated packet dot ───────────────────────────────────────────────────────

function PacketDot({ from, to, color, label, dur }) {
  const path = `M${from.x},${from.y} L${to.x},${to.y}`;
  return (
    <g>
      <animateMotion dur={`${dur}s`} fill="freeze" begin="0s" path={path} />
      <circle r={8} fill={color} opacity={0.95} filter="url(#pkt-glow)" />
      {label && (
        <text textAnchor="middle" dy="-13" fontSize="8" fontFamily="var(--font-mono)"
          fill={color} fontWeight="700" pointerEvents="none">
          {label}
        </text>
      )}
    </g>
  );
}

// ── Tooltips ──────────────────────────────────────────────────────────────────

function NodeTooltip({ node }) {
  const meta = NODE_META[node.type] || NODE_META.default;
  const extras = Object.entries(node)
    .filter(([k]) => !['id', 'label', 'type', 'x', 'y', 'state', 'desc', 'healthy'].includes(k))
    .filter(([, v]) => v !== undefined && v !== null && typeof v !== 'object');
  return (
    <>
      <div className={styles.ttTitle}>{meta.icon} {node.label}</div>
      {node.type  && <div className={styles.ttRow}><b>Type</b>  {node.type}</div>}
      {node.state && <div className={styles.ttRow}><b>State</b> {node.state}</div>}
      {node.desc  && <div className={styles.ttDesc}>{node.desc}</div>}
      {node.healthy === false && <div className={styles.ttWarn}>⚠ Node is DOWN</div>}
      {extras.map(([k, v]) => (
        <div key={k} className={styles.ttRow}><b>{k}</b> {String(v)}</div>
      ))}
      <div className={styles.ttHint}>Drag to reposition</div>
    </>
  );
}

function EdgeTooltip({ edge }) {
  return (
    <>
      <div className={styles.ttTitle}>{edge.from} → {edge.to}</div>
      {edge.protocol && <div className={styles.ttRow}><b>Protocol</b> {edge.protocol}</div>}
      <div className={styles.ttRow}><b>Pattern</b> {edge.async ? '⚡ Async (non-blocking)' : '⇄ Sync (blocking)'}</div>
      {edge.label    && <div className={styles.ttRow}><b>Label</b>    {edge.label}</div>}
      {edge.desc     && <div className={styles.ttDesc}>{edge.desc}</div>}
    </>
  );
}
