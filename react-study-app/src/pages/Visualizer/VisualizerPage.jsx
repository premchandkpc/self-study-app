import { useState, Suspense, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { SimulationProvider } from '../../core/context/SimulationContext';
import { VISUALIZERS } from './visualizers.config';
import { TOPIC_DEFS } from '../../core/constants/topics';
import ExplanationCard from '../../components/shared/ExplanationCard/ExplanationCard';
import Button from '../../components/shared/Button/Button';
import Card from '../../components/shared/Card/Card';
import Loading from '../../components/shared/Loading/Loading';
import styles from './VisualizerPage.module.css';

function findStudyData(type, scenarioId) {
  for (const t of TOPIC_DEFS) {
    for (const s of (t.subtopics || [])) {
      if (s.visualizer === type && s.scenarioId === scenarioId) {
        return { topicId: t.id, subtopicName: s.name, data: s };
      }
    }
  }
  return null;
}

export default function VisualizerPage() {
  const { type, scenarioId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const viz = VISUALIZERS[type];
  const hash = location.hash.slice(1);

  const [mode, setMode] = useState('sim');
  const [subtab, setSubtab] = useState(0);

  useEffect(() => {
    if (hash === 'learn') setMode('learn');
    else if (hash && hash !== 'sim') setMode('learn');
  }, [hash]);

  const study = scenarioId ? findStudyData(type, scenarioId) : null;
  const hasStudy = !!(study && study.data?.explanation);

  if (!viz) {
    return (
      <div className={styles.page}>
        <p style={{ color: 'var(--text-muted)' }}>Visualizer not found: {type}</p>
        <Button variant="secondary" onClick={() => navigate('/topics')}>← Back</Button>
      </div>
    );
  }

  const Comp = viz.component;
  const tabName = hash && hash !== 'learn' && hash !== 'sim' ? decodeURIComponent(hash) : null;

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

      {hasStudy && (
        <div className={styles.modeTabs}>
          <button
            className={`${styles.modeTab} ${mode === 'sim' ? styles.modeTabActive : ''}`}
            onClick={() => setMode('sim')}
          >
            ▶ Simulation
          </button>
          <button
            className={`${styles.modeTab} ${mode === 'learn' ? styles.modeTabActive : ''}`}
            onClick={() => setMode('learn')}
          >
            📖 Learn
          </button>
        </div>
      )}

      {mode === 'learn' && hasStudy ? (
        <div className={styles.studyContent}>
          {study.data.tabs ? (
            <>
              <div className={styles.tabNav}>
                {study.data.tabs.map((t, i) => (
                  <button
                    key={t.name}
                    className={`${styles.tabNavBtn} ${i === subtab ? styles.tabNavBtnActive : ''}`}
                    onClick={() => setSubtab(i)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <ExplanationCard
                topic={study.topicId}
                subtopic={study.data.tabs[subtab].name}
                data={study.data.tabs[subtab]}
              />
            </>
          ) : (
            <ExplanationCard
              topic={study.topicId}
              subtopic={study.subtopicName}
              data={study.data}
            />
          )}
        </div>
      ) : (
        <>
          <div className={styles.guideSection}>
            <Card variant="default">
              <div className={styles.guideContent}>
                <h3 className={styles.guideTitle}>How to Use This Visualizer</h3>
                <ul className={styles.guideList}>
                  <li>Click <strong>▶ Play</strong> to execute step-by-step</li>
                  <li>Adjust input values to test different scenarios</li>
                  <li>Use <strong>Speed</strong> slider to control animation pace</li>
                  <li>Click <strong>Reset</strong> to start over</li>
                  <li>Watch how data structures change with each operation</li>
                </ul>
              </div>
            </Card>
          </div>

          <div className={styles.vizWrapper}>
            <SimulationProvider>
              <Suspense fallback={<Loading label="Loading visualizer…" />}>
                <Comp key={scenarioId || type} scenarioId={scenarioId} tabName={tabName} />
              </Suspense>
            </SimulationProvider>
          </div>
        </>
      )}
    </div>
  );
}
