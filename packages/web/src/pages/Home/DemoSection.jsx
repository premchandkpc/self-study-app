import { memo, lazy, Suspense, useState } from 'react';
import Loading from '../../components/shared/Loading/Loading';
import { SimulationProvider } from '../../core/context/SimulationContext';
import styles from './Home.module.css';

const ArrayVisualizer = lazy(() => import('../../legacy/dsa/arrays/ArrayVisualizer/ArrayVisualizer'));
const GraphVisualizer = lazy(() => import('../../legacy/dsa/graphs/GraphVisualizer/GraphVisualizer'));
const KafkaVisualizer = lazy(() => import('../../legacy/system-design/kafka/KafkaVisualizer/KafkaVisualizer'));

const DEMO_TABS = [
  { id: 'array', label: '📊 Array' },
  { id: 'graph', label: '🕸️ Graph' },
  { id: 'kafka', label: '📨 Kafka' },
];

export const DemoSection = memo(function DemoSection({ initialDemo = 'array' }) {
  const [activeDemo, setActiveDemo] = useState(initialDemo);
  return (
    <section className={styles.demoSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Live Demo</h2>
        <p className={styles.sectionSub}>Step through algorithms interactively</p>
      </div>

      <div className={styles.demoTabs}>
        {DEMO_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.demoTab} ${activeDemo === tab.id ? styles.activeTab : ''}`}
            onClick={() => setActiveDemo(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeDemo === 'array' && (
        <SimulationProvider>
          <Suspense fallback={<Loading />}>
            <ArrayVisualizer arr={[2, 1, 5, 1, 3, 2]} k={3} />
          </Suspense>
        </SimulationProvider>
      )}

      {activeDemo === 'graph' && (
        <SimulationProvider>
          <Suspense fallback={<Loading />}>
            <GraphVisualizer />
          </Suspense>
        </SimulationProvider>
      )}

      {activeDemo === 'kafka' && (
        <SimulationProvider>
          <Suspense fallback={<Loading />}>
            <KafkaVisualizer />
          </Suspense>
        </SimulationProvider>
      )}
    </section>
  );
});
