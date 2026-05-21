import { useNavigate, useParams } from 'react-router-dom';
import { TOPICS } from '../../core/constants/topics';
import { TOPIC_META } from '../../core/constants/topicMeta';
import { TOPIC_EXPLANATIONS } from '../../core/constants/topicExplanations';
import { SUBTOPIC_ROUTES } from '../../core/constants/routes';
import Button from '../../components/shared/Button/Button';
import ExplanationCard from '../../components/shared/ExplanationCard/ExplanationCard';
import CaseStudy from '../../components/shared/CaseStudy/CaseStudy';
import Badge from '../../components/shared/Badge/Badge';
import styles from './Topics.module.css';

export default function SubtopicDetail() {
  const navigate = useNavigate();
  const { topicId, subtopic } = useParams();

  const topic = TOPICS.find((t) => t.id === topicId);
  const meta = TOPIC_META[topicId] || {};
  const explanations = TOPIC_EXPLANATIONS[topicId];

  if (!topic || !subtopic) {
    return (
      <div className={styles.page}>
        <p className={styles.sub}>Subtopic not found.</p>
        <Button variant="secondary" onClick={() => navigate('/topics')}>← Back to Topics</Button>
      </div>
    );
  }

  const subtopicData = explanations?.subtopics?.[subtopic];

  return (
    <div className={styles.page}>
      <div className={styles.detailHeader}>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/topics/${topicId}`)}>
          ← {topic.label}
        </Button>
        <div className={styles.detailTitle}>
          <span className={styles.detailIcon}>{topic.icon}</span>
          <div>
            <h1 className={styles.title}>{subtopic}</h1>
            <p className={styles.sub}>{meta.desc}</p>
          </div>
        </div>
      </div>

      {subtopicData && (
        <ExplanationCard
          topic={topicId}
          subtopic={subtopic}
          data={subtopicData}
        />
      )}

      <div className={styles.actions}>
        <Button
          variant="primary"
          size="md"
          icon="▶️"
          onClick={() => navigate(`/topics`)}
        >
          View Visualizer
        </Button>
        <Button
          variant="secondary"
          size="md"
          icon="📚"
          onClick={() => navigate(`/interview`)}
        >
          Practice Questions
        </Button>
      </div>
    </div>
  );
}
