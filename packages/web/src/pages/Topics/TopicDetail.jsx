import { useNavigate } from 'react-router-dom';
import { useTopicMapsContext } from '../../core/context/useTopicMapsContext';
import Button from '../../components/shared/Button/Button';
import DetailPageHeader from '../../components/shared/DetailPageHeader/DetailPageHeader';
import StudyGuide from '../../components/shared/StudyGuide/StudyGuide';
import SubtopicCard from './SubtopicCard';
import styles from './Topics.module.css';

export default function TopicDetail({ topicId }) {
  const navigate = useNavigate();
  const { TOPICS, ABBR_MAP } = useTopicMapsContext();
  const topic = TOPICS.find((t) => t.id === topicId);
  const meta = topic?.meta || {};

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
      <DetailPageHeader
        backLabel="Topics"
        onBack={() => navigate('/topics')}
        icon={topic.icon}
        title={topic.label}
        desc={meta.desc}
      />

      {(meta.objectives || meta.keyTopics) && (
        <StudyGuide
          objectives={meta.objectives}
          keyTopics={meta.keyTopics}
        />
      )}

      <div className={styles.modulesGrid}>
        {topic.subtopics.map((sub, i) => (
          <SubtopicCard
            key={sub.slug || sub.name}
            topicAbbr={topic.abbr}
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
