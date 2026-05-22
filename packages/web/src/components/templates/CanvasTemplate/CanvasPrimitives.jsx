import { NODE_META } from './CanvasPrimitives.constants';

export function NodeShape({ type, cx, cy, w, h, fill, stroke, strokeWidth, opacity }) {
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

export function PacketDot({ from, to, color, label, dur }) {
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

export function CanvasNodeTooltip({ node, styles }) {
  const meta = NODE_META[node.type] || NODE_META.default;
  const icon = node.icon || meta.icon;
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
