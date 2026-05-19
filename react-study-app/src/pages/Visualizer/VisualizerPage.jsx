import { Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SimulationProvider } from '../../core/context/SimulationContext';
import { VISUALIZERS } from './visualizers.config';
import Button from '../../components/shared/Button/Button';
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
