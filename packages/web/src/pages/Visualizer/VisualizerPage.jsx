import { useState, Suspense, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { SimulationProvider } from '../../core/context/SimulationContext';
import { useTopicMapsContext } from '../../core/context/TopicMapsContext';
import { useSubtopic } from '../../core/hooks/useSubtopic';
import { VISUALIZERS } from './visualizers.config';
import ExplanationCard from '../../components/shared/ExplanationCard/ExplanationCard';
import Button from '../../components/shared/Button/Button';
import Card from '../../components/shared/Card/Card';
import Loading from '../../components/shared/Loading/Loading';
import styles from './VisualizerPage.module.css';

export default function VisualizerPage() {
  const { abbr, slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const hash = location.hash.slice(1);

  const [mode, setMode] = useState('sim');
  const [subtab, setSubtab] = useState(0);
  const { SLUG_MAP, ABBR_MAP } = useTopicMapsContext();
  const { data: subtopicData, isLoading: isSubtopicLoading } = useSubtopic(abbr, slug);

  useEffect(() => {
    if (hash === 'learn') setMode('learn');
    else if (hash && hash !== 'sim') setMode('learn');
  }, [hash]);

  // If no slug: show topic detail (subtopic listing)
  if (!slug) {
    const topicInfo = ABBR_MAP[abbr];
    if (!topicInfo) {
      return (
        <div className={styles.page}>
          <p style={{ color: 'var(--text-muted)' }}>Topic not found: {abbr}</p>
          <Button variant="secondary" onClick={() => navigate('/topics')}>← Back</Button>
        </div>
      );
    }
    return (
      <div className={styles.page}>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Back</Button>
        <div className={styles.meta}>
          <span className={styles.icon}>{topicInfo.icon}</span>
          <div>
            <h1 className={styles.title}>{topicInfo.label}</h1>
            <p className={styles.desc}>{topicInfo.meta?.desc}</p>
          </div>
        </div>
        <div className={styles.subtopicList}>
          {topicInfo.subtopics.map((s, i) => {
            const key = `${topicInfo.abbr}:${s.scenarioId || slugify(s.name)}`;
            return (
              <Card key={i} variant="default" hoverable className={styles.subtopicCard}
                onClick={() => navigate(`/${topicInfo.abbr}/${s.scenarioId || slugify(s.name)}`)}>
                <span>{s.name}</span>
                {s.scenarioId && <span className={styles.simBadge}>▶ Sim</span>}
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Has slug: find subtopic via SLUG_MAP
  const entry = SLUG_MAP[`${abbr}:${slug}`];
  if (!entry) {
    return (
      <div className={styles.page}>
        <p style={{ color: 'var(--text-muted)' }}>Not found: /{abbr}/{slug}</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>← Back</Button>
      </div>
    );
  }

  const viz = VISUALIZERS[entry.visualizer];
  const hasStudy = !!entry.explanation;
  const tabName = hash && hash !== 'learn' && hash !== 'sim' ? decodeURIComponent(hash) : null;

  if (!viz) {
    return (
      <div className={styles.page}>
        <p style={{ color: 'var(--text-muted)' }}>Visualizer not found: {entry.visualizer}</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>← Back</Button>
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
            <h1 className={styles.title}>{entry.name}</h1>
            <p className={styles.desc}>{viz.desc}</p>
          </div>
        </div>
      </div>

      {hasStudy && (
        <div className={styles.modeTabs}>
          <button className={`${styles.modeTab} ${mode === 'sim' ? styles.modeTabActive : ''}`}
            onClick={() => setMode('sim')}>▶ Simulation</button>
          <button className={`${styles.modeTab} ${mode === 'learn' ? styles.modeTabActive : ''}`}
            onClick={() => setMode('learn')}>📖 Learn</button>
        </div>
      )}

      {mode === 'learn' && hasStudy ? (
        <div className={styles.studyContent}>
          {isSubtopicLoading ? (
            <Loading label="Loading content…" />
          ) : subtopicData ? (
            subtopicData.tabs ? (
              <>
                <div className={styles.tabNav}>
                  {subtopicData.tabs.map((t, i) => (
                    <button key={t.name}
                      className={`${styles.tabNavBtn} ${i === subtab ? styles.tabNavBtnActive : ''}`}
                      onClick={() => setSubtab(i)}>{t.name}</button>
                  ))}
                </div>
                <ExplanationCard topic={subtopicData.topicId} subtopic={subtopicData.tabs[subtab].name} data={subtopicData.tabs[subtab]} />
              </>
            ) : (
              <ExplanationCard topic={subtopicData.topicId} subtopic={subtopicData.name} data={subtopicData} />
            )
          ) : (
            <div style={{ color: 'var(--text-muted)', padding: '20px' }}>Failed to load content</div>
          )}
        </div>
      ) : (
        <>
          <div className={styles.guideSection}>
            <Card variant="default">
              <div className={styles.guideContent}>
                <h3 className={styles.guideTitle}>How to Use</h3>
                <ul className={styles.guideList}>
                  <li>Click <strong>▶ Play</strong> to execute step-by-step</li>
                  <li>Adjust inputs to test different scenarios</li>
                  <li>Use <strong>Speed</strong> slider to control animation</li>
                  <li>Click <strong>Reset</strong> to start over</li>
                </ul>
              </div>
            </Card>
          </div>
          <div className={styles.vizWrapper}>
            <SimulationProvider>
              <Suspense fallback={<Loading label="Loading visualizer…" />}>
                <Comp key={entry.slug || entry.visualizer} scenarioId={entry.scenarioId} tabName={tabName} />
              </Suspense>
            </SimulationProvider>
          </div>
        </>
      )}
    </div>
  );
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
