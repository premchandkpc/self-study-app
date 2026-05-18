import { useEffect, useState } from 'react';
import { useSimulation } from '../../../core/context/SimulationContext';
import { buildBFSSteps, buildDFSSteps, ALGO_CODE } from './graph-engine';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import Button from '../../shared/Button/Button';
import styles from './GraphVisualizer.module.css';

const DEFAULT_NODES = [
  { id: 'A', x: 260, y: 60 },
  { id: 'B', x: 120, y: 180 },
  { id: 'C', x: 400, y: 180 },
  { id: 'D', x: 60,  y: 300 },
  { id: 'E', x: 200, y: 300 },
  { id: 'F', x: 340, y: 300 },
  { id: 'G', x: 460, y: 300 },
];

const DEFAULT_EDGES = [
  { from: 'A', to: 'B' },
  { from: 'A', to: 'C' },
  { from: 'B', to: 'D' },
  { from: 'B', to: 'E' },
  { from: 'C', to: 'F' },
  { from: 'C', to: 'G' },
];

const NODE_STYLE = {
  default:  { fill: 'var(--bg-hover)',   stroke: 'var(--node-default)',  label: 'var(--node-default)' },
  active:   { fill: 'rgba(247,129,102,0.2)', stroke: 'var(--node-active)',  label: 'var(--node-active)' },
  visiting: { fill: 'rgba(227,179,65,0.2)',  stroke: 'var(--node-comparing)', label: 'var(--node-comparing)' },
  visited:  { fill: 'rgba(63,185,80,0.2)',   stroke: 'var(--node-visited)',  label: 'var(--node-visited)' },
  done:     { fill: 'rgba(124,77,255,0.2)',  stroke: 'var(--node-done)',     label: 'var(--node-done)' },
};

const EDGE_STYLE = {
  default: 'var(--edge-default)',
  active:  'var(--edge-active)',
  visited: 'var(--node-visited)',
};

export default function GraphVisualizer({
  nodes = DEFAULT_NODES,
  edges = DEFAULT_EDGES,
  startNode = 'A',
}) {
  const { state, dispatch } = useSimulation();
  const [algo, setAlgo] = useState('bfs');
  const [nodeStates, setNodeStates] = useState({});
  const [edgeStates, setEdgeStates] = useState({});

  function initSteps(selectedAlgo) {
    const steps = selectedAlgo === 'bfs'
      ? buildBFSSteps(nodes, edges, startNode)
      : buildDFSSteps(nodes, edges, startNode);
    dispatch({ type: 'SET_STEPS', payload: steps });
  }

  useEffect(() => {
    initSteps(algo);
  }, [algo, nodes, edges, startNode]);

  useEffect(() => {
    const step = state.steps[state.currentStep];
    if (step) {
      setNodeStates(step.nodeStates || {});
      setEdgeStates(step.edgeStates || {});
    }
  }, [state.currentStep, state.steps]);

  function switchAlgo(a) {
    setAlgo(a);
    dispatch({ type: 'RESET' });
  }

  const W = 520, H = 370, R = 22;

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.algoTabs}>
          {['bfs', 'dfs'].map((a) => (
            <Button
              key={a}
              variant={algo === a ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => switchAlgo(a)}
            >
              {a.toUpperCase()}
            </Button>
          ))}
        </div>
        <NarrationPanel />
      </div>

      <div className={styles.vizArea}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* edges */}
          {edges.map((edge) => {
            const from = nodes.find((n) => n.id === edge.from);
            const to   = nodes.find((n) => n.id === edge.to);
            if (!from || !to) return null;
            const ek  = `${edge.from}-${edge.to}`;
            const ekr = `${edge.to}-${edge.from}`;
            const st  = edgeStates[ek] || edgeStates[ekr] || 'default';
            const color = EDGE_STYLE[st] || EDGE_STYLE.default;
            const isActive = st === 'active';
            return (
              <line
                key={ek}
                x1={from.x} y1={from.y}
                x2={to.x}   y2={to.y}
                stroke={color}
                strokeWidth={isActive ? 2.5 : 1.5}
                strokeDasharray={isActive ? '6 3' : undefined}
                className={isActive ? styles.flowEdge : ''}
              />
            );
          })}

          {/* nodes */}
          {nodes.map((node) => {
            const st  = nodeStates[node.id] || 'default';
            const nst = NODE_STYLE[st] || NODE_STYLE.default;
            const isActive = st === 'active' || st === 'visiting';
            return (
              <g key={node.id} className={`${styles.node} ${isActive ? styles.nodeActive : ''}`}>
                <circle
                  cx={node.x} cy={node.y} r={R}
                  fill={nst.fill}
                  stroke={nst.stroke}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                <text
                  x={node.x} y={node.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={nst.label}
                  fontSize={13}
                  fontWeight={700}
                  fontFamily="var(--font-mono)"
                >
                  {node.id}
                </text>
              </g>
            );
          })}
        </svg>

        <div className={styles.rightPanels}>
          <CodePanel code={ALGO_CODE[algo]} language={algo.toUpperCase()} />
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}
