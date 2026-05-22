import { memo } from 'react';
import styles from '../DatabaseVisualizer.module.css';

function computePositions(nodes) {
  const positions = {};
  const rootNode = nodes.find((n) => n.id === 'root');
  if (!rootNode) return positions;

  const levelY = { 0: 40, 1: 120, 2: 200 };
  const assignPos = (nodeId, level, xMin, xMax) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const x = (xMin + xMax) / 2;
    const y = levelY[level] || 40 + level * 80;
    positions[nodeId] = { x, y };
    const children = node.children || [];
    if (children.length > 0) {
      const slotW = (xMax - xMin) / children.length;
      children.forEach((childId, i) => {
        assignPos(childId, level + 1, xMin + i * slotW, xMin + (i + 1) * slotW);
      });
    }
  };

  assignPos('root', 0, 50, 550);
  return positions;
}

const BTreeSVG = memo(function BTreeSVG({ nodes }) {
  const rootNode = nodes.find((n) => n.id === 'root');
  if (!rootNode) {
    return <text x="300" y="120" textAnchor="middle" fill="var(--text-muted)" fontSize="14">Tree is empty</text>;
  }

  const positions = computePositions(nodes);

  return (
    <>
      {nodes.map((node) =>
        (node.children || []).map((childId, _i) => {
          const parentPos = positions[node.id];
          const childPos = positions[childId];
          if (!parentPos || !childPos) return null;
          return (
            <line
              key={`${node.id}-${childId}`}
              x1={parentPos.x} y1={parentPos.y + 18}
              x2={childPos.x} y2={childPos.y - 18}
              stroke="var(--border)" strokeWidth="1.5"
            />
          );
        })
      )}
      {nodes.map((node) => {
        const pos = positions[node.id];
        if (!pos) return null;
        const width = Math.max(60, node.keys.length * 30 + 20);
        return (
          <g key={node.id}>
            <rect
              x={pos.x - width / 2} y={pos.y - 18}
              width={width} height={36}
              rx="6" ry="6"
              fill={node.active ? 'color-mix(in srgb, var(--node-active) 20%, var(--bg-secondary))' : 'var(--bg-secondary)'}
              stroke={node.active ? 'var(--node-active)' : node.type === 'internal' ? 'var(--node-comparing)' : 'var(--border)'}
              strokeWidth={node.active ? '2' : '1.5'}
            />
            <text x={pos.x} y={pos.y + 5} textAnchor="middle" fill={node.active ? 'var(--node-active)' : 'var(--text-primary)'} fontSize="13" fontFamily="var(--font-mono)" fontWeight="600">
              {node.keys.join(' | ') || '—'}
            </text>
          </g>
        );
      })}
    </>
  );
});

export const BTreeView = memo(function BTreeView({ viz }) {
  const nodes = viz.nodes || [];

  return (
    <div className={styles.btreeContainer}>
      <div className={styles.btreeLabel}>
        B-Tree ({viz.operation === 'search' ? '🔍 Searching' : '✏ Inserting'} {viz.target !== null ? viz.target : ''})
      </div>
      <svg className={styles.btreeSvg} viewBox="0 0 600 240" preserveAspectRatio="xMidYMid meet">
        <BTreeSVG nodes={nodes} />
      </svg>
    </div>
  );
});
