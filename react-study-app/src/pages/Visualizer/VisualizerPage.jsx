import { Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SimulationProvider } from '../../core/context/SimulationContext';
import { VISUALIZERS } from './visualizers.config';
import Button from '../../components/shared/Button/Button';
import Card from '../../components/shared/Card/Card';
import Loading from '../../components/shared/Loading/Loading';
import styles from './VisualizerPage.module.css';

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

      <div className={styles.guideSection}>
        <Card variant="default">
          <div className={styles.guideContent}>
            <h3 className={styles.guideTitle}>💡 How to Use This Visualizer</h3>
            <ul className={styles.guideList}>
              <li>Click <strong>▶ Play</strong> to execute the algorithm step-by-step</li>
              <li>Adjust input values to test different scenarios</li>
              <li>Use <strong>Speed</strong> slider to control animation pace</li>
              <li>Click <strong>Reset</strong> to start over with modified inputs</li>
              <li>Watch how data structures change with each operation</li>
            </ul>
          </div>
        </Card>
      </div>

      <div className={styles.vizWrapper}>
        <SimulationProvider>
          <Suspense fallback={<Loading label="Loading visualizer…" />}>
            <Comp />
          </Suspense>
        </SimulationProvider>
      </div>
    </div>
  );
}
