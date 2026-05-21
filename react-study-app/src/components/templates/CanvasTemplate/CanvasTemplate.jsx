import { useState, useRef, useEffect } from 'react';
import { ICONS, NODE_COLORS } from '../../visualizers/sd-types';
import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import { useSimulation } from '../../../core/context/SimulationContext';
import { STATE_COLORS, PKT_COLORS } from '../../../core/constants/colors';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import ConceptPanel from '../../shared/ConceptPanel/ConceptPanel';
import { SvgArrowDefs, SvgEventsList, SvgEdgeTooltip, SvgSharedStyles } from '../../shared/SvgComponents.jsx';
import styles from './CanvasTemplate.module.css';

const NODE_META = {
  ...Object.fromEntries(
    Object.entries(ICONS).map(([type, icon]) => [type, { color: NODE_COLORS[type] || 'var(--node-default)', icon }])
  ),
  default: { color: 'var(--node-default)', icon: '\u25CF' },
};

const NODE_W   = 108;
const NODE_H   = 54;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 3.5;
const INIT_PAN = { x: 60, y: 50 };

const TABS = [
  { key: 'notes', label: 'Design Notes', icon: '📝' },
  { key: 'code', label: 'Code', icon: '💻' },
  { key: 'tradeoffs', label: 'Tradeoffs', icon: '⚖️' },
  { key: 'practices', label: 'Best Practices', icon: '✅' },
];

function getLayerColors(index, total) {
  const palette = [
    { fill: 'rgba(100,140,255,0.12)', border: 'rgba(100,140,255,0.45)' },
    { fill: 'rgba(255,160,50,0.12)',  border: 'rgba(255,160,50,0.50)' },
    { fill: 'rgba(60,200,120,0.12)',  border: 'rgba(60,200,120,0.42)' },
    { fill: 'rgba(80,190,220,0.12)',  border: 'rgba(80,190,220,0.42)' },
    { fill: 'rgba(190,110,220,0.12)', border: 'rgba(190,110,220,0.42)' },
    { fill: 'rgba(220,90,90,0.12)',   border: 'rgba(220,90,90,0.42)' },
    { fill: 'rgba(255,80,120,0.10)',  border: 'rgba(255,80,120,0.40)' },
    { fill: 'rgba(50,210,180,0.10)',  border: 'rgba(50,210,180,0.40)' },
  ];
  return palette[index % palette.length];
}

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
  const [tab,       setTab]       = useState('notes');

  useEffect(() => { setAnimKey(k => k + 1); }, [simState.currentStep]);
  useEffect(() => { setPositions({}); needsFitRef.current = true; }, [activeId]);
  useEffect(() => {
    if (!viz || !needsFitRef.current) return;
    needsFitRef.current = false;
    fitFnRef.current?.();
  }, [viz]);

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
  const pktDur  = Math.max(0.5, Math.min(simState.speed * 0.02, 2.5));
  const minusSign = String.fromCharCode(0x2212);
  const fitIcon = String.fromCharCode(0x229E);

  const hasConcepts = !!viz.concepts;

  const codeNotes  = viz.codeNotes || [];
  const codeBlock  = viz.code || [];
  const tradeoffs  = viz.tradeoffs || [];
  const practices  = viz.bestPractices || [];

  const hasContent = codeNotes.length > 0 || codeBlock.length > 0 || tradeoffs.length > 0 || practices.length > 0;

  const canvasEl = (
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
        <SvgSharedStyles />
        <SvgArrowDefs prefix="ct" />
        <defs>
          <filter id="pkt-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="ct-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

          <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
            {active.layers && nodes.length > 0 && (() => {
              const yMin = Math.min(...nodes.map(n => nodePos(n).y)) - NODE_H / 2 - 30;
              const yMax = Math.max(...nodes.map(n => nodePos(n).y)) + NODE_H / 2 + 30;
              const layerH = yMax - yMin;
              return active.layers.map((lyr, i) => {
                const lx = lyr.x1;
                const lw = lyr.x2 - lyr.x1;
                const lc = getLayerColors(i, active.layers.length);
                return (
                  <g key={`lyr-${i}`} pointerEvents="none">
                    <rect
                      x={lx} y={yMin}
                      width={lw} height={layerH}
                      rx={14} fill={lyr.color || lc.fill}
                      stroke={lyr.border || lc.border} strokeWidth={1.5}
                      className={styles.layer}
                    />
                    <text
                      x={lx + lw / 2} y={yMin + 16}
                      textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)"
                      fill={lyr.border || lc.border} opacity={0.9} letterSpacing="1"
                      className={styles.layerLabel}>
                      {lyr.label.toUpperCase()}
                    </text>
                    <line
                      x1={lx + lw / 2 - 18} y1={yMin + 22}
                      x2={lx + lw / 2 + 18} y2={yMin + 22}
                      stroke={lyr.border || lc.border} strokeWidth={0.5} opacity={0.4}
                    />
                  </g>
                );
              });
            })()}

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
              const stroke   = hot ? 'var(--node-active)' : isAsync ? 'var(--kafka-producer)' : 'var(--edge-default)';
              const dashArr  = hot ? '8 3' : isAsync ? '6 4' : 'none';
              const mx = (fp.x + tp.x) / 2;
              const my = (fp.y + tp.y) / 2;
              return (
                <g key={i}
                  onMouseEnter={ev => handleNodeHover('edge', edge, ev)}
                  onMouseLeave={() => handleNodeHover(null, null, null)}
                >
                  <line x1={fp.x} y1={fp.y} x2={tp.x} y2={tp.y}
                    stroke={stroke}
                    strokeWidth={hot ? 2.5 : 1.5}
                    strokeDasharray={dashArr}
                    strokeOpacity={hot ? 1 : 0.85}
                    markerEnd={hot ? 'url(#ct-arrow-active)' : 'url(#ct-arrow)'}
                    style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
                  />
                  <line x1={fp.x} y1={fp.y} x2={tp.x} y2={tp.y}
                    stroke="transparent" strokeWidth={18} />
                  {(edge.label || edge.protocol) && (
                    <text x={mx} y={my - 9}
                      textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)"
                      fill={hot ? 'var(--node-active)' : 'var(--text-muted)'}
                      fontWeight={hot ? 700 : 500} pointerEvents="none">
                      {edge.protocol || edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {nodes.map(n => {
              const pos  = nodePos(n);
              const meta = NODE_META[n.type] || NODE_META.default;
              const fill = STATE_COLORS[n.state] || meta.color;
              const isDrag = dragging?.nodeId === n.id;
              const isHover = hovered?.kind === 'node' && hovered?.data?.id === n.id;
              return (
                <g key={n.id}
                  data-nodeid={n.id}
                  className={styles.nodeGroup}
                  style={{
                    cursor: isDrag ? 'move' : 'pointer',
                    userSelect: 'none',
                    '--node-glow-c': fill,
                  }}
                  onMouseEnter={ev => handleNodeHover('node', n, ev)}
                  onMouseLeave={() => handleNodeHover(null, null, null)}
                  onMouseDown={e => e.stopPropagation()}
                >
                  <NodeShape
                    type={n.type} cx={pos.x} cy={pos.y} w={NODE_W} h={NODE_H}
                    fill={`color-mix(in srgb, ${fill} 28%, transparent)`}
                    stroke={fill}
                    strokeWidth={isDrag || n.state === 'active' || isHover ? 2.5 : 1.5}
                    opacity={n.healthy === false ? 0.38 : 1}
                  />
                  <text x={pos.x} y={pos.y - 3}
                    textAnchor="middle" fontSize="18" dominantBaseline="middle"
                    pointerEvents="none">
                    {n.icon ?? meta.icon}
                  </text>
                  <text x={pos.x} y={pos.y + 17}
                    textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)"
                    fill="var(--text-primary)" fontWeight="600" pointerEvents="none">
                    {(n.label || '').split('\n')[0]}
                  </text>
                  {n.healthy === false && (
                    <text x={pos.x} y={pos.y - NODE_H / 2 - 6}
                      textAnchor="middle" fontSize="10" fill="var(--pod-crash)" pointerEvents="none">
                      {'\u2715'} DOWN
                    </text>
                  )}
                  {isDrag && (
                    <rect x={pos.x - NODE_W / 2 - 4} y={pos.y - NODE_H / 2 - 4}
                      width={NODE_W + 8} height={NODE_H + 8} rx={12}
                      fill="none" stroke="var(--node-active)"
                      strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6}
                    />
                  )}
                </g>
              );
            })}

            {packets.map(pkt => {
              const fn = nodes.find(n => n.id === pkt.from);
              const tn = nodes.find(n => n.id === pkt.to);
              if (!fn || !tn) return null;
              return (
                <PacketDot
                  key={`${animKey}-${pkt.id}`}
                  from={nodePos(fn)} to={nodePos(tn)}
                  color={PKT_COLORS[pkt.type] || PKT_COLORS.default}
                  label={pkt.label} dur={pktDur}
                />
              );
            })}
          </g>
        </svg>

        {hovered && (() => {
          const cw = canvasRef.current?.clientWidth ?? 800;
          const ch = canvasRef.current?.clientHeight ?? 400;
          const tx = Math.min(hovered.sx + 18, cw - 270);
          const ty = Math.min(hovered.sy + 12, ch - 140);
          return (
            <div className={styles.tooltip} style={{ left: tx, top: ty }}>
              {hovered.kind === 'node' && <CanvasNodeTooltip node={hovered.data} styles={styles} />}
              {hovered.kind === 'edge' && <SvgEdgeTooltip edge={hovered.data} styles={styles} />}
            </div>
          );
        })()}

        <div className={styles.zoomBar}>
          <button className={styles.zBtn} title="Zoom in"
            onClick={() => setScale(s => Math.min(MAX_ZOOM, +(s * 1.3).toFixed(2)))}>+</button>
          <span className={styles.zLabel}>{Math.round(scale * 100)}%</span>
          <button className={styles.zBtn} title="Zoom out"
            onClick={() => setScale(s => Math.max(MIN_ZOOM, +(s / 1.3).toFixed(2)))}>{minusSign}</button>
          <button className={styles.zBtn} title="Fit to content"
            onClick={fitToContent}>{fitIcon}</button>
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="var(--edge-default)" strokeWidth="2"/><polygon points="16,1 22,4 16,7" fill="var(--edge-default)"/></svg>
            Sync
          </span>
          <span className={styles.legendItem}>
            <svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="var(--kafka-producer)" strokeWidth="2" strokeDasharray="5 3"/><polygon points="16,1 22,4 16,7" fill="var(--kafka-producer)"/></svg>
            Async
          </span>
          <span className={styles.legendHint}>Drag nodes · Scroll zoom · Pan bg</span>
        </div>
      </div>
  );

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={scenarios} active={activeId} onChange={select} />
      {canvasEl}
      <NarrationPanel />
      {hasConcepts && <ConceptPanel concepts={{ ...(viz.concepts || {}), ...(active.topicContent || {}) }} />}
      <SvgEventsList events={events} max={5} styles={styles} />
      {metrics.length > 0 && <MetricsPanel metrics={metrics} />}

      {hasContent && (
        <div className={styles.contentSection}>
          <div className={styles.contentTabs}>
            {TABS.filter(t => {
              if (t.key === 'notes') return codeNotes.length > 0;
              if (t.key === 'code') return codeBlock.length > 0;
              if (t.key === 'tradeoffs') return tradeoffs.length > 0;
              if (t.key === 'practices') return practices.length > 0;
              return false;
            }).map(t => (
              <button key={t.key}
                className={`${styles.contentTab} ${tab === t.key ? styles.contentTabActive : ''}`}
                onClick={() => setTab(t.key)}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className={styles.contentBody}>
            {tab === 'notes' && codeNotes.length > 0 && (
              <div className={styles.notesGrid}>
                {codeNotes.map((note, i) => (
                  <div key={i} className={styles.noteCard}>
                    <div className={styles.noteCardHeader}>
                      <span className={styles.noteCardDot} />
                      <strong className={styles.noteCardTitle}>{note.title}</strong>
                    </div>
                    <p className={styles.noteCardContent}>{note.content}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === 'code' && codeBlock.length > 0 && (
              <pre className={styles.codeBlock}>
                <code>{codeBlock.join('\n')}</code>
              </pre>
            )}

            {tab === 'tradeoffs' && tradeoffs.length > 0 && (
              <div className={styles.tradeoffsGrid}>
                {tradeoffs.map((t, i) => (
                  <div key={i} className={styles.tradeoffCard}>
                    <div className={styles.tradeoffSide}>
                      <span className={styles.tradeoffLabel}>Pro</span>
                      <p className={styles.tradeoffText}>{t.pro}</p>
                    </div>
                    <div className={styles.tradeoffDivider} />
                    <div className={styles.tradeoffSide}>
                      <span className={styles.tradeoffLabel}>Con</span>
                      <p className={styles.tradeoffText}>{t.con}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'practices' && practices.length > 0 && (
              <ul className={styles.practicesList}>
                {practices.map((p, i) => (
                  <li key={i} className={styles.practiceItem}>
                    <span className={styles.practiceCheck}>{'\u2713'}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <StepControls />
    </div>
  );
}

function NodeShape({ type, cx, cy, w, h, fill, stroke, strokeWidth, opacity }) {
  const p = { fill, stroke, strokeWidth };
  if (type === 'client' || type === 'raft') {
    const r = Math.min(w, h) / 2 + 2;
    return <circle cx={cx} cy={cy} r={r} opacity={opacity} {...p} />;
  }
  if (type === 'db') {
    const ey = h * 0.16;
    return (
      <g opacity={opacity}>
        <rect x={cx - w/2} y={cy - h/2 + ey} width={w} height={h - ey * 2} fill={fill} stroke="none" />
        <ellipse cx={cx} cy={cy - h/2 + ey} rx={w/2} ry={ey} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <ellipse cx={cx} cy={cy + h/2 - ey} rx={w/2} ry={ey} fill={fill} stroke="none" />
        <rect x={cx - w/2} y={cy - h/2 + ey} width={w} height={h - ey * 2} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        <ellipse cx={cx} cy={cy - h/2 + ey} rx={w/2} ry={ey} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
      </g>
    );
  }
  return <rect x={cx - w/2} y={cy - h/2} width={w} height={h} rx={10} opacity={opacity} {...p} />;
}

function PacketDot({ from, to, color, label, dur }) {
  const path = `M${from.x},${from.y} L${to.x},${to.y}`;
  return (
    <g>
      <animateMotion dur={`${dur}s`} fill="freeze" begin="0s" path={path}
        calcMode="spline" keySplines="0.4 0 0.6 1" keyTimes="0;1" />
      <circle r={6} fill={color} opacity={0.95} filter="url(#pkt-glow)" />
      {label && (
        <text textAnchor="middle" dy="-12" fontSize="8" fontFamily="var(--font-mono)"
          fill={color} fontWeight="700" pointerEvents="none">
          {label}
        </text>
      )}
    </g>
  );
}

function CanvasNodeTooltip({ node, styles }) {
  const meta   = NODE_META[node.type] || NODE_META.default;
  const icon   = node.icon || meta.icon;
  const HIDDEN = ['id', 'label', 'type', 'x', 'y', 'state', 'desc', 'healthy', 'icon'];
  const extras = Object.entries(node)
    .filter(([k]) => !HIDDEN.includes(k))
    .filter(([, v]) => v !== undefined && v !== null && typeof v !== 'object');
  return (
    <>
      <div className={styles.ttTitle}>{icon} {node.label}</div>
      {node.type  && <div className={styles.ttRow}><b>Type</b>  {node.type}</div>}
      {node.state && <div className={styles.ttRow}><b>State</b> {node.state}</div>}
      {node.desc  && <div className={styles.ttDesc}>{node.desc}</div>}
      {node.healthy === false && <div className={styles.ttWarn}>{'\u26A0'} Node is DOWN</div>}
      {extras.map(([k, v]) => (
        <div key={k} className={styles.ttRow}><b>{k}</b> {String(v)}</div>
      ))}
      <div className={styles.ttHint}>Drag to reposition</div>
    </>
  );
}
