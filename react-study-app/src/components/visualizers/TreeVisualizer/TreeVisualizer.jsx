import { useEffect, useState } from 'react';
import { useSimulation } from '../../../core/context/SimulationContext';
import {
  buildInsertSteps, buildTraversalSteps,
  layoutTree, INSERT_CODE, TRAVERSAL_CODE,
} from './tree-engine';
import StepControls from '../../shared/StepControls/StepControls';
import NarrationPanel from '../../shared/NarrationPanel/NarrationPanel';
import ComplexityPanel from '../../shared/ComplexityPanel/ComplexityPanel';
import CodePanel from '../../shared/CodePanel/CodePanel';
import Button from '../../shared/Button/Button';
import styles from './TreeVisualizer.module.css';

const INSERT_VALUES = [50, 30, 70, 20, 40, 60, 80];

const NODE_COLORS = {
  default:  { fill: 'var(--bg-hover)',           stroke: 'var(--node-default)', text: 'var(--node-default)' },
  active:   { fill: 'rgba(247,129,102,0.2)',      stroke: 'var(--node-active)',  text: 'var(--node-active)' },
  visited:  { fill: 'rgba(63,185,80,0.2)',        stroke: 'var(--node-visited)', text: 'var(--node-visited)' },
  done:     { fill: 'rgba(124,77,255,0.2)',       stroke: 'var(--node-done)',    text: 'var(--node-done)' },
  comparing:{ fill: 'rgba(227,179,65,0.2)',       stroke: 'var(--node-comparing)', text: 'var(--node-comparing)' },
};

const MODES = ['insert', 'inorder', 'preorder', 'postorder'];

// Build full BST for traversal modes
function buildFinalBST(values) {
  let root = null;
  function ins(r, v) {
    if (!r) return { val: v, left: null, right: null, state: 'default' };
    if (v < r.val) return { ...r, left: ins(r.left, v) };
    if (v > r.val) return { ...r, right: ins(r.right, v) };
    return r;
  }
  for (const v of values) root = ins(root, v);
  return root;
}

export default function TreeVisualizer({ values = INSERT_VALUES }) {
  const { state, dispatch } = useSimulation();
  const [mode, setMode] = useState('insert');
  const [tree, setTree] = useState(null);
  const [visited, setVisited] = useState([]);

  function initMode(m) {
    setMode(m);
    dispatch({ type: 'RESET' });
    if (m === 'insert') {
      dispatch({ type: 'SET_STEPS', payload: buildInsertSteps(values) });
    } else {
      const bst = buildFinalBST(values);
      dispatch({ type: 'SET_STEPS', payload: buildTraversalSteps(bst, m) });
    }
  }

  useEffect(() => { initMode('insert'); }, []);

  useEffect(() => {
    const step = state.steps[state.currentStep];
    if (!step) return;
    setTree(layoutTree(step.tree));
    setVisited(step.visited || []);
  }, [state.currentStep, state.steps]);

  const code = mode === 'insert' ? INSERT_CODE : TRAVERSAL_CODE[mode] || [];

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.modeTabs}>
          {MODES.map((m) => (
            <Button
              key={m}
              variant={mode === m ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => initMode(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </Button>
          ))}
        </div>
        <NarrationPanel />
      </div>

      <div className={styles.vizArea}>
        <div className={styles.svgWrap}>
          <svg
            className={styles.svg}
            viewBox="0 0 600 380"
            preserveAspectRatio="xMidYMid meet"
          >
            {tree && <TreeEdges node={tree} />}
            {tree && <TreeNodes node={tree} />}
          </svg>
        </div>

        <div className={styles.rightPanels}>
          <CodePanel code={code} language="JavaScript" />
          {visited.length > 0 && (
            <div className={styles.visitedBar}>
              <span className={styles.visitedLabel}>Visited:</span>
              {visited.map((v, i) => (
                <span key={i} className={styles.visitedVal}>{v}</span>
              ))}
            </div>
          )}
          <ComplexityPanel />
        </div>
      </div>

      <StepControls />
    </div>
  );
}

function TreeEdges({ node }) {
  if (!node) return null;
  return (
    <>
      {node.left && (
        <>
          <line
            x1={node.x} y1={node.y}
            x2={node.left.x} y2={node.left.y}
            stroke="var(--edge-default)"
            strokeWidth={1.5}
          />
          <TreeEdges node={node.left} />
        </>
      )}
      {node.right && (
        <>
          <line
            x1={node.x} y1={node.y}
            x2={node.right.x} y2={node.right.y}
            stroke="var(--edge-default)"
            strokeWidth={1.5}
          />
          <TreeEdges node={node.right} />
        </>
      )}
    </>
  );
}

function TreeNodes({ node }) {
  if (!node) return null;
  const st = NODE_COLORS[node.state] || NODE_COLORS.default;
  const isActive = node.state === 'active';
  return (
    <>
      <g className={styles.treeNode}>
        <circle
          cx={node.x} cy={node.y} r={20}
          fill={st.fill}
          stroke={st.stroke}
          strokeWidth={isActive ? 2.5 : 1.5}
          className={isActive ? styles.nodeActive : ''}
        />
        <text
          x={node.x} y={node.y}
          textAnchor="middle"
          dominantBaseline="central"
          fill={st.text}
          fontSize={12}
          fontWeight={700}
          fontFamily="var(--font-mono)"
        >
          {node.val}
        </text>
      </g>
      <TreeNodes node={node.left} />
      <TreeNodes node={node.right} />
    </>
  );
}
