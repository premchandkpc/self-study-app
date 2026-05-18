import { useParams, useNavigate } from 'react-router-dom';
import { SimulationProvider } from '../../core/context/SimulationContext';
import ArrayVisualizer from '../../components/visualizers/ArrayVisualizer/ArrayVisualizer';
import GraphVisualizer from '../../components/visualizers/GraphVisualizer/GraphVisualizer';
import KafkaVisualizer from '../../components/visualizers/KafkaVisualizer/KafkaVisualizer';
import JVMVisualizer from '../../components/visualizers/JVMVisualizer/JVMVisualizer';
import TreeVisualizer from '../../components/visualizers/TreeVisualizer/TreeVisualizer';
import KubernetesVisualizer from '../../components/visualizers/KubernetesVisualizer/KubernetesVisualizer';
import ThreadVisualizer from '../../components/visualizers/ThreadVisualizer/ThreadVisualizer';
import SystemDesignVisualizer from '../../components/visualizers/SystemDesignVisualizer/SystemDesignVisualizer';
import Button from '../../components/shared/Button/Button';
import styles from './VisualizerPage.module.css';

const VISUALIZERS = {
  array: {
    label: 'Array — Sliding Window',
    icon: '📊',
    component: ArrayVisualizer,
    desc: 'Maximum sum subarray of size k. O(n) time, O(1) space.',
  },
  kafka: {
    label: 'Kafka — Producer → Partition → Consumer',
    icon: '📨',
    component: KafkaVisualizer,
    desc: 'Partitioned log, ISR replication, consumer groups, lag, leader election.',
  },
  graph: {
    label: 'Graph — BFS / DFS',
    icon: '🕸️',
    component: GraphVisualizer,
    desc: 'Breadth-First and Depth-First traversal. O(V+E) time.',
  },
  jvm: {
    label: 'JVM — Heap, GC, Thread Stack',
    icon: '☕',
    component: JVMVisualizer,
    desc: 'Eden → Survivor → Old Gen allocation, Minor GC, Full GC stop-the-world.',
  },
  tree: {
    label: 'BST — Insert & Traversals',
    icon: '🌳',
    component: TreeVisualizer,
    desc: 'BST insert path animation. Inorder / Preorder / Postorder traversals.',
  },
  kubernetes: {
    label: 'Kubernetes — Pods, HPA, Rolling, CrashLoop',
    icon: '☸️',
    component: KubernetesVisualizer,
    desc: 'Pod scheduling, HPA scale-out, rolling deployments, CrashLoopBackOff.',
  },
  threads: {
    label: 'Threads — Mutex, Deadlock, Semaphore',
    icon: '🧵',
    component: ThreadVisualizer,
    desc: 'Thread states, mutex lock/unlock, deadlock cycle, semaphore counting.',
  },
  systemdesign: {
    label: 'System Design — LB, Cache, CDN, Raft',
    icon: '🏗️',
    component: SystemDesignVisualizer,
    desc: 'Load balancer round-robin, Redis LRU cache, CDN edge, Raft leader election.',
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
