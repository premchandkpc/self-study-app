import { useState } from 'react';
import { useVisualizerScenario } from '../../../core/hooks/useVisualizerScenario';
import ScenarioToolbar from '../../shared/ScenarioToolbar/ScenarioToolbar';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import MetricsPanel from '../../shared/MetricsPanel/MetricsPanel';
import styles from './TechTemplate.module.css';

const SVG_W = 680;
const SVG_H = 320;

const BOX_STYLE = {
  thread:    { fill: 'var(--node-active)',    icon: '🧵' },
  goroutine: { fill: 'var(--node-active)',    icon: '🐹' },
  heap:      { fill: 'var(--pod-crash)',      icon: '📦' },
  stack:     { fill: 'var(--node-visited)',   icon: '📋' },
  channel:   { fill: 'var(--kafka-producer)', icon: '📡' },
  mutex:     { fill: 'var(--node-comparing)', icon: '🔒' },
  process:   { fill: 'var(--node-default)',   icon: '⚙' },
  gc:        { fill: 'var(--node-done)',      icon: '♻' },
  eden:      { fill: 'var(--node-active)',    icon: '🌱' },
  survivor:  { fill: 'var(--node-comparing)', icon: '🔄' },
  old:       { fill: 'var(--node-done)',      icon: '🏛' },
  default:   { fill: 'var(--node-default)',   icon: '▣' },
};

const STATE_COLOR = {
  active:  'var(--node-active)',
  blocked: 'var(--pod-crash)',
  waiting: 'var(--node-comparing)',
  running: 'var(--pod-running)',
  done:    'var(--node-done)',
};

/**
 * TechTemplate — for language/runtime scenarios (Java JVM, Go goroutines, Python GIL, etc.)
 *
 * Step shape:
 *   boxes:  [{ id, label, type, x, y, state?, desc?, value? }]
 *   flows:  [{ from, to, label?, protocol?, direction? }]
 *   events: [{ type, msg }]
 *   threads/goroutines: [] (alias for boxes)
 */
export default function TechTemplate({ scenarios }) {
  const { activeId, active, viz, select, metrics } = useVisualizerScenario(scenarios);
  const [hovered, setHovered] = useState(null);

  if (!viz) return null;

  // Support both 'boxes'/'flows' AND legacy 'nodes'/'edges' field names
  const boxes  = viz.boxes  || viz.nodes  || viz.threads || viz.goroutines || [];
  const flows  = viz.flows  || viz.edges  || [];
  const events = viz.events || [];

  return (
    <div className={styles.wrapper}>
      <ScenarioToolbar scenarios={scenarios} active={activeId} onChange={select} />

      <NarrationPanel />

      <div className={styles.body}>
        <div className={styles.diagramWrap}>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className={styles.svg}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <marker id="tt-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0,8 3,0 6" fill="var(--border)" />
              </marker>
              <marker id="tt-arrow-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0,8 3,0 6" fill="var(--node-active)" />
              </marker>
            </defs>

            {flows.map((flow, i) => (
              <FlowSvg
                key={i}
                flow={flow}
                boxes={boxes}
                hovered={hovered?.kind === 'flow' && hovered.data === flow}
                onHover={(on) => setHovered(on ? { kind: 'flow', data: flow } : null)}
              />
            ))}

            {boxes.map((box) => (
              <BoxSvg
                key={box.id}
                box={box}
                hovered={hovered?.kind === 'box' && hovered.data === box}
                onHover={(on) => setHovered(on ? { kind: 'box', data: box } : null)}
              />
            ))}
          </svg>

          {hovered && (
            <div className={styles.tooltip}>
              {hovered.kind === 'box'  && <BoxTooltip  box={hovered.data} />}
              {hovered.kind === 'flow' && <FlowTooltip flow={hovered.data} />}
            </div>
          )}
        </div>

        <div className={styles.right}>
          <CodePanel code={active.code} language={active.language} />
          {metrics.length > 0 && <MetricsPanel metrics={metrics} />}
        </div>
      </div>

      {events.length > 0 && (
        <div className={styles.events}>
          {events.slice(-4).map((ev, i) => (
            <div key={i} className={`${styles.event} ${styles[`ev${ev.type}`]}`}>
              <span className={styles.evDot} />{ev.msg}
            </div>
          ))}
        </div>
      )}

      <StepControls />
    </div>
  );
}

function BoxSvg({ box, hovered, onHover }) {
  const base  = BOX_STYLE[box.type] || BOX_STYLE.default;
  const fill  = STATE_COLOR[box.state] || base.fill;
  const W = 120, H = 50;
  const rx = box.x - W / 2;
  const ry = box.y - H / 2;

  return (
    <g style={{ cursor: 'pointer' }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <rect x={rx} y={ry} width={W} height={H} rx={8}
        fill={`color-mix(in srgb, ${fill} 18%, transparent)`}
        stroke={fill}
        strokeWidth={hovered || box.state === 'active' || box.state === 'running' ? 2.5 : 1.5}
      />
      <text x={box.x} y={box.y - 6}
        textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)"
        fill="var(--text-primary)" fontWeight="700">
        {base.icon} {box.label}
      </text>
      {box.value !== undefined && (
        <text x={box.x} y={box.y + 10}
          textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill={fill}>
          {String(box.value)}
        </text>
      )}
      {box.state && (
        <text x={box.x} y={box.y + (box.value !== undefined ? 22 : 10)}
          textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill={fill}>
          {box.state.toUpperCase()}
        </text>
      )}
    </g>
  );
}

function FlowSvg({ flow, boxes, hovered, onHover }) {
  const from = boxes.find((b) => b.id === flow.from);
  const to   = boxes.find((b) => b.id === flow.to);
  if (!from || !to) return null;

  const active = hovered;
  const stroke = active ? 'var(--node-active)' : 'var(--border)';
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;

  return (
    <g style={{ cursor: 'pointer' }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
        stroke={stroke} strokeWidth={active ? 2 : 1}
        strokeDasharray={active ? '6 3' : 'none'}
        markerEnd={active ? 'url(#tt-arrow-active)' : 'url(#tt-arrow)'}
      />
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
        stroke="transparent" strokeWidth={14}
      />
      {(flow.label || flow.protocol) && (
        <text x={mx} y={my - 6}
          textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)"
          fill={active ? 'var(--node-active)' : 'var(--text-muted)'}>
          {flow.protocol || flow.label}
        </text>
      )}
    </g>
  );
}

function BoxTooltip({ box }) {
  const base = BOX_STYLE[box.type] || BOX_STYLE.default;
  return (
    <>
      <div className={styles.ttTitle}>{base.icon} {box.label}</div>
      {box.type  && <div className={styles.ttRow}><b>Type</b>  {box.type}</div>}
      {box.state && <div className={styles.ttRow}><b>State</b> {box.state}</div>}
      {box.desc  && <div className={styles.ttDesc}>{box.desc}</div>}
      {Object.entries(box)
        .filter(([k]) => !['id','label','type','x','y','state','desc'].includes(k))
        .filter(([, v]) => v !== undefined && typeof v !== 'object')
        .map(([k, v]) => (
          <div key={k} className={styles.ttRow}><b>{k}</b> {String(v)}</div>
        ))}
    </>
  );
}

function FlowTooltip({ flow }) {
  return (
    <>
      <div className={styles.ttTitle}>{flow.from} → {flow.to}</div>
      {flow.protocol && <div className={styles.ttRow}><b>Protocol</b> {flow.protocol}</div>}
      {flow.label    && <div className={styles.ttRow}><b>Label</b>    {flow.label}</div>}
      {flow.direction && <div className={styles.ttRow}><b>Direction</b> {flow.direction}</div>}
      {flow.desc     && <div className={styles.ttDesc}>{flow.desc}</div>}
    </>
  );
}
