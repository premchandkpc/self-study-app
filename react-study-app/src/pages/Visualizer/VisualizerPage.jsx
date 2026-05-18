import { useParams, useNavigate } from 'react-router-dom';
import { SimulationProvider } from '../../core/context/SimulationContext';
import ArrayVisualizer from '../../components/visualizers/ArrayVisualizer/ArrayVisualizer';
import GraphVisualizer from '../../components/visualizers/GraphVisualizer/GraphVisualizer';
import Button from '../../components/shared/Button/Button';
import styles from './VisualizerPage.module.css';

const VISUALIZERS = {
  array: {
    label: 'Array — Sliding Window',
    icon: '📊',
    component: ArrayVisualizer,
    desc: 'Maximum sum subarray of size k. O(n) time, O(1) space.',
  },
  graph: {
    label: 'Graph — BFS / DFS',
    icon: '🕸️',
    component: GraphVisualizer,
    desc: 'Breadth-First and Depth-First traversal. O(V+E) time.',
  },
};

export default function VisualizerPage() {
  const { type } = useParams();
  const navigate = useNavigate();
  const viz = VISUALIZERS[type];

  if (!viz) {
    return (
      <div className={styles.page}>
        <p style={{ color: 'var(--text-muted)' }}>Visualizer not found: {type}</p>
        <Button variant="secondary" onClick={() => navigate('/topics')}>← Back</Button>
      </div>
    );
  }

  const Comp = viz.component;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Back</Button>
        <div className={styles.meta}>
          <span className={styles.icon}>{viz.icon}</span>
          <div>
            <h1 className={styles.title}>{viz.label}</h1>
            <p className={styles.desc}>{viz.desc}</p>
          </div>
        </div>
      </div>

      <div className={styles.vizWrapper}>
        <SimulationProvider>
          <Comp />
        </SimulationProvider>
      </div>
    </div>
  );
}
