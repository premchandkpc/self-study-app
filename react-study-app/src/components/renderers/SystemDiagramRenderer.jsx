import { useSvgHover } from '../../core/hooks/useSvgHover';
import { SYSTEM_NODE_META, STATE_COLORS, PKT_COLORS } from '../../core/constants/colors';
import { SvgArrowDefs, SvgSharedStyles, SvgNodeTooltip, SvgEdgeTooltip, SvgNodeRect, SvgEdgeLine, SvgPacketDot } from '../shared/SvgComponents.jsx';

export function SystemDiagramRenderer({ viz, svgW = 700, svgH = 380, prefix = 'st', styles = {}, tooltipStyles = {} }) {
  const { hovered, bindHover } = useSvgHover();

  if (!viz) return null;

  const nodes   = viz.nodes   || [];
  const edges   = viz.edges   || [];
  const packets = viz.packets || [];

  const tooltipStyle = Object.keys(tooltipStyles).length ? tooltipStyles : styles;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)' }} preserveAspectRatio="xMidYMid meet">
        <SvgSharedStyles />
        <SvgArrowDefs prefix={prefix} />

        {edges.map((edge, i) => {
          const from = nodes.find((n) => n.id === edge.from);
          const to   = nodes.find((n) => n.id === edge.to);
          if (!from || !to) return null;
          const active = packets.some((p) => (p.from === edge.from && p.to === edge.to) || (p.from === edge.to && p.to === edge.from));
          return (
            <g key={i} {...bindHover('edge', edge)}>
              <SvgEdgeLine edge={edge} fromPos={from} toPos={to} active={active} edgePrefix={prefix} />
            </g>
          );
        })}

        {nodes.map((n) => (
          <g key={n.id} {...bindHover('node', n)}>
            <SvgNodeRect node={n} nodeMeta={SYSTEM_NODE_META} stateColors={STATE_COLORS} prefix={prefix} />
          </g>
        ))}

        {packets.map((pkt) => {
          const from = nodes.find((n) => n.id === pkt.from);
          const to   = nodes.find((n) => n.id === pkt.to);
          if (!from || !to) return null;
          return <SvgPacketDot key={pkt.id} fromPos={from} toPos={to} pkt={pkt} pktColors={PKT_COLORS} />;
        })}
      </svg>

      {hovered && (
        <div className={styles.tooltip || 'tooltip'} style={{
          position: 'absolute',
          left: Math.min(hovered.mouseX + 14, svgW - 270),
          top: Math.min(hovered.mouseY + 10, svgH - 160),
          background: 'var(--glass-bg-strong)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          borderRadius: 10, padding: '10px 14px', minWidth: 180, maxWidth: 260,
          fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-md)', pointerEvents: 'none', zIndex: 20,
        }}>
          {hovered.kind === 'node' && <SvgNodeTooltip node={hovered.data} nodeMeta={SYSTEM_NODE_META} styles={tooltipStyle} />}
          {hovered.kind === 'edge' && <SvgEdgeTooltip edge={hovered.data} styles={tooltipStyle} />}
        </div>
      )}
    </div>
  );
}
