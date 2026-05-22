import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTopicMapsContext } from '../../core/context/useTopicMapsContext';
import { buildTopicRoute } from '../../core/topics/topicRoutes';
import DetailPageHeader from '../../components/shared/DetailPageHeader/DetailPageHeader';
import Button from '../../components/shared/Button/Button';
import ExplanationCard from '../../components/shared/ExplanationCard/ExplanationCard';
import styles from './Topics.module.css';

export default function SubtopicDetail() {
  const { TOPICS, ABBR_MAP, TOPIC_EXPLANATIONS } = useTopicMapsContext();
  const navigate = useNavigate();
  const { topicId, subtopic } = useParams();
  const [searchParams, setSearchParams] = useSearchParams({ tab: '0' });
  const activeTab = parseInt(searchParams.get('tab') || '0', 10);

  const topic = TOPICS.find((t) => t.id === topicId);
  const meta = ABBR_MAP[topic?.abbr]?.meta || {};
  const explanations = topicId ? TOPIC_EXPLANATIONS[topicId] : null;

  if (!topic || !subtopic) {
    return (
      <div className={styles.page}>
        <p className={styles.sub}>Subtopic not found.</p>
        <Button variant="secondary" onClick={() => navigate('/topics')}>← Back to Topics</Button>
      </div>
    );
  }

  const subtopicData = explanations?.subtopics?.[subtopic];
  const hasTabs = !!(subtopicData?.tabs?.length);
  const activeTabData = hasTabs ? subtopicData.tabs[activeTab] : null;

  return (
    <div className={styles.page}>
      <DetailPageHeader
        backLabel={topic.label}
        onBack={() => navigate(buildTopicRoute(topic.abbr))}
        icon={topic.icon}
        title={subtopic}
        desc={meta.desc}
      />

      {hasTabs && (
        <div className={styles.tabNav}>
          {subtopicData.tabs.map((t, i) => (
            <button key={t.name}
              className={`${styles.tabNavBtn} ${i === activeTab ? styles.tabNavBtnActive : ''}`}
              onClick={() => setSearchParams({ tab: String(i) })}>{t.name}</button>
          ))}
        </div>
      )}

      {subtopicData && (
        hasTabs && activeTabData ? (
          <ExplanationCard topic={topicId} subtopic={activeTabData.name} data={activeTabData} />
        ) : (
          <ExplanationCard topic={topicId} subtopic={subtopic} data={subtopicData} />
        )
      )}

      <div className={styles.actions}>
        <Button variant="primary" size="md" icon="▶️"
          onClick={() => navigate(buildTopicRoute(topic.abbr))}>View Visualizer</Button>
        <Button variant="secondary" size="md" icon="📚"
          onClick={() => navigate(`/interview`)}>Practice Questions</Button>
      </div>
    </div>
  );
}
