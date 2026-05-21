import { memo } from 'react';
import { GRAPH_NODE_COLORS } from '../../../../core/constants/colors';
import styles from '../../../templates/DSATemplate/DSATemplate.module.css';

const GRAPH_NODES = {
  A: { x: 260, y: 60 }, B: { x: 120, y: 180 }, C: { x: 400, y: 180 },
  D: { x: 60, y: 300 }, E: { x: 200, y: 300 }, F: { x: 340, y: 300 }, G: { x: 460, y: 300 },
};
const GRAPH_EDGES = [
  ['A', 'B'], ['A', 'C'], ['B', 'D'], ['B', 'E'], ['C', 'F'], ['C', 'G'],
];

export const GraphViz = memo(function GraphViz({ viz }) {
  const { nodeStates = {}, edgeStates = {} } = viz;
  return (
    <svg className={styles.graphSvg} viewBox="0 0 520 370" preserveAspectRatio="xMidYMid meet">
      {GRAPH_EDGES.map(([a, b]) => {
        const pa = GRAPH_NODES[a], pb = GRAPH_NODES[b];
        const key = `${a}-${b}`;
        const es = edgeStates[key] || edgeStates[`${b}-${a}`] || 'default';
        return (
          <line key={key} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
            stroke={es === 'active' ? 'var(--node-active)' : es === 'visited' ? 'var(--node-visited)' : 'var(--border)'}
            strokeWidth={es === 'active' ? 2 : 1} />
        );
      })}
      {Object.entries(GRAPH_NODES).map(([id, pos]) => {
        const ns = nodeStates[id] || 'default';
        const c = GRAPH_NODE_COLORS[ns] || GRAPH_NODE_COLORS.default;
        return (
          <g key={id}>
            <circle cx={pos.x} cy={pos.y} r={22}
              fill={`color-mix(in srgb, ${c} 20%, transparent)`} stroke={c}
              strokeWidth={ns === 'active' ? 2.5 : 1.5} />
            <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central"
              fill={c} fontSize={12} fontWeight={700} fontFamily="var(--font-mono)">{id}</text>
          </g>
        );
      })}
    </svg>
  );
});
