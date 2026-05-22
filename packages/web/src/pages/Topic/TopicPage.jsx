import { useState, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { SimulationProvider } from '../../core/context/SimulationContext';
import { useTopicMapsContext } from '../../core/context/useTopicMapsContext';
import { VISUALIZERS } from '../Visualizer/visualizers.config';
import { DETAILED_EXPLANATIONS } from '../../core/constants/detailedExplanations';
import ExplanationCard from '../../components/shared/ExplanationCard/ExplanationCard';
import DetailedExplanation from '../../components/shared/DetailedExplanation/DetailedExplanation';
import Button from '../../components/shared/Button/Button';
import Card from '../../components/shared/Card/Card';
import Loading from '../../components/shared/Loading/Loading';
import styles from './TopicPage.module.css';

const ABBR_TO_EXPLANATION_KEY = {
  array: 'arrays',
  binarysearch: 'binarySearch',
  graph: 'graphs',
  dp: 'dynamicProgramming',
  sorting: 'sorting_bubble',
};

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function TopicLanding({ abbr, topicInfo }) {
  const navigate = useNavigate();
  const expKey = ABBR_TO_EXPLANATION_KEY[abbr];
  const expData = DETAILED_EXPLANATIONS[expKey];

  return (
    <div>
      <div className={styles.meta}>
        <span className={styles.icon}>{topicInfo.icon}</span>
        <div>
          <h1 className={styles.title}>{topicInfo.label}</h1>
          <p className={styles.desc}>{topicInfo.meta?.desc}</p>
        </div>
      </div>

      {abbr === 'systemdesign' && (
        <div className={styles.docActions}>
          <div className={styles.docActionsLabel}>Full System Design Documents</div>
          <div className={styles.docActionsBtns}>
            <Card variant="default" hoverable className={styles.docActionCard}
              onClick={() => navigate('/read/whatsapp')}>
              <span className={styles.docActionIcon}>💬</span>
              <div>
                <div className={styles.docActionTitle}>WhatsApp</div>
                <div className={styles.docActionDesc}>Complete deep dive</div>
              </div>
              <span className={styles.docActionArrow}>→</span>
            </Card>
            <Card variant="default" hoverable className={styles.docActionCard}
              onClick={() => navigate('/read/uber')}>
              <span className={styles.docActionIcon}>🚗</span>
              <div>
                <div className={styles.docActionTitle}>Uber</div>
                <div className={styles.docActionDesc}>Complete deep dive</div>
              </div>
              <span className={styles.docActionArrow}>→</span>
            </Card>
          </div>
        </div>
      )}

      <div className={styles.subtopicList}>
        {topicInfo.subtopics.map((s) => (
          <Card key={s.slug || s.scenarioId || slugify(s.name)} variant="default" hoverable className={styles.subtopicCard}
            onClick={() => navigate(`/topic/${topicInfo.abbr}/${s.scenarioId || slugify(s.name)}`)}>
            <span>{s.name}</span>
            {s.scenarioId && <span className={styles.simBadge}> Sim</span>}
          </Card>
        ))}
      </div>

      {expData && (
        <div className={styles.overviewSection}>
          <DetailedExplanation topic={expKey} data={expData} />
        </div>
      )}
    </div>
  );
}

function TopicSubtopic({ abbr, slug }) {
  const navigate = useNavigate();
  const location = useLocation();
  const hash = location.hash.slice(1);
  const [subtab, setSubtab] = useState(0);
  const { SLUG_MAP } = useTopicMapsContext();

  const mode = hash === 'learn' || (hash && hash !== 'sim') ? 'learn' : 'sim';
  const entry = SLUG_MAP[`${abbr}:${slug}`];

  if (!entry) {
    return (
      <div>
        <p style={{ color: 'var(--text-muted)' }}>Not found: /{abbr}/{slug}</p>
        <Button variant="secondary" onClick={() => navigate(`/topic/${abbr}`)}>← Back</Button>
      </div>
    );
  }

  const viz = VISUALIZERS[entry.visualizer];
  const hasStudy = !!entry.explanation;
  const tabName = hash && hash !== 'learn' && hash !== 'sim' ? decodeURIComponent(hash) : null;

  return (
    <div>
      <div className={styles.header}>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/topic/${abbr}`)}>← Topic</Button>
        <div className={styles.meta}>
          {viz && <span className={styles.icon}>{viz.icon}</span>}
          <div>
            <h1 className={styles.title}>{entry.name}</h1>
            {viz && <p className={styles.desc}>{viz.desc}</p>}
          </div>
        </div>
      </div>

      {hasStudy && (
        <div className={styles.modeTabs}>
          <button className={`${styles.modeTab} ${mode === 'sim' ? styles.modeTabActive : ''}`}
            onClick={() => navigate('#sim', { replace: true })}> Simulation</button>
          <button className={`${styles.modeTab} ${mode === 'learn' ? styles.modeTabActive : ''}`}
            onClick={() => navigate('#learn', { replace: true })}> Learn</button>
        </div>
      )}

      {mode === 'learn' && hasStudy ? (
        <div className={styles.studyContent}>
          {entry.tabs ? (
            <>
              <div className={styles.tabNav}>
                {entry.tabs.map((t, i) => (
                  <button key={t.name}
                    className={`${styles.tabNavBtn} ${i === subtab ? styles.tabNavBtnActive : ''}`}
                    onClick={() => setSubtab(i)}>{t.name}</button>
                ))}
              </div>
              <ExplanationCard topic={entry.topicId} subtopic={entry.tabs[subtab].name} data={entry.tabs[subtab]} />
            </>
          ) : (
            <ExplanationCard topic={entry.topicId} subtopic={entry.name} data={entry} />
          )}
        </div>
      ) : (
        <>
          {viz && (
            <div className={styles.guideSection}>
              <Card variant="default">
                <div className={styles.guideContent}>
                  <h3 className={styles.guideTitle}>How to Use</h3>
                  <ul className={styles.guideList}>
                    <li>Click <strong> Play</strong> to execute step-by-step</li>
                    <li>Adjust inputs to test different scenarios</li>
                    <li>Use <strong>Speed</strong> slider to control animation</li>
                    <li>Click <strong>Reset</strong> to start over</li>
                  </ul>
                </div>
              </Card>
            </div>
          )}
          <div className={styles.vizWrapper}>
            <SimulationProvider>
              <Suspense fallback={<Loading label="Loading visualizer…" />}>
                {viz ? (
                  <viz.component key={entry.slug || entry.visualizer} visualizerType={entry.visualizer} scenarioId={entry.scenarioId} tabName={tabName} />
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>Visualizer not found: {entry.visualizer}</p>
                )}
              </Suspense>
            </SimulationProvider>
          </div>
        </>
      )}
    </div>
  );
}

export default function TopicPage() {
  const { abbr, slug } = useParams();
  const navigate = useNavigate();
  const { ABBR_MAP } = useTopicMapsContext();

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
      {slug ? (
        <TopicSubtopic abbr={abbr} slug={slug} />
      ) : (
        <TopicLanding abbr={abbr} topicInfo={topicInfo} />
      )}
    </div>
  );
}
