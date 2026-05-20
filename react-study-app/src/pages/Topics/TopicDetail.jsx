import { useNavigate } from 'react-router-dom';
import { TOPICS } from '../../core/constants/topics';
import { TOPIC_META } from '../../core/constants/topicMeta';
import Button from '../../components/shared/Button/Button';
import StudyGuide from '../../components/shared/StudyGuide/StudyGuide';
import SubtopicCard from './SubtopicCard';
import styles from './Topics.module.css';

export default function TopicDetail({ topicId }) {
  const navigate = useNavigate();
  const topic = TOPICS.find((t) => t.id === topicId);
  const meta  = TOPIC_META[topicId] || {};

  if (!topic) {
    return (
      <div className={styles.page}>
        <p className={styles.sub}>Topic not found.</p>
        <Button variant="secondary" onClick={() => navigate('/topics')}>← Back</Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.detailHeader}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/topics')}>← Topics</Button>
        <div className={styles.detailTitle}>
          <span className={styles.detailIcon}>{topic.icon}</span>
          <div>
            <h1 className={styles.title}>{topic.label}</h1>
            <p className={styles.sub}>{meta.desc}</p>
          </div>
        </div>
      </div>

      {(meta.objectives || meta.keyTopics) && (
        <StudyGuide
          objectives={meta.objectives}
          keyTopics={meta.keyTopics}
        />
      )}

      <div className={styles.modulesGrid}>
        {topic.subtopics.map((sub, i) => (
          <SubtopicCard
            key={sub}
            topicId={topicId}
            topicIcon={topic.icon}
            subtopic={sub}
            color={meta.color}
            delay={i * 40}
          />
        ))}
      </div>
    </div>
  );
}
