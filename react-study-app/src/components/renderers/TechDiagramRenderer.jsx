import { useSvgHover } from '../../core/hooks/useSvgHover';
import { TECH_BOX_META, STATE_COLORS } from '../../core/constants/colors';
import { SvgArrowDefs, SvgSharedStyles, SvgFlowTooltip, SvgBoxRect, SvgEdgeLine, SvgNodeTooltip } from '../shared/SvgComponents.jsx';
export function TechDiagramRenderer({ viz, svgW = 680, svgH = 320, prefix = 'tt', styles = {} }) {
  const { hovered, bindHover } = useSvgHover();

  if (!viz) return null;

  const boxes = viz.boxes || viz.nodes || viz.threads || viz.goroutines || [];
  const flows = viz.flows || viz.edges || [];

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)' }} preserveAspectRatio="xMidYMid meet">
        <SvgSharedStyles />
        <SvgArrowDefs prefix={prefix} />

        {flows.map((flow, i) => {
          const from = boxes.find((b) => b.id === flow.from);
          const to   = boxes.find((b) => b.id === flow.to);
          if (!from || !to) return null;
          return (
            <g key={i} {...bindHover('flow', flow)}>
              <SvgEdgeLine edge={flow} fromPos={from} toPos={to} active={false} edgePrefix={prefix} />
            </g>
          );
        })}

        {boxes.map((box) => (
          <g key={box.id} {...bindHover('box', box)}>
            <SvgBoxRect box={box} boxMeta={TECH_BOX_META} stateColors={STATE_COLORS} prefix={prefix} />
          </g>
        ))}
      </svg>

      {hovered && (
        <div className={styles.tooltip || ''} style={{
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
          {hovered.kind === 'box' && <SvgNodeTooltip node={hovered.data} nodeMeta={TECH_BOX_META} styles={styles} />}
          {hovered.kind === 'flow' && <SvgFlowTooltip flow={hovered.data} styles={styles} />}
        </div>
      )}
    </div>
  );
}
