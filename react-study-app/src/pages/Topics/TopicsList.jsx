import { useNavigate } from 'react-router-dom';
import { TOPICS } from '../../core/constants/topics';
import { TOPIC_META } from '../../core/constants/topicMeta';
import Card, { CardHeader, CardBody } from '../../components/shared/Card/Card';
import Badge from '../../components/shared/Badge/Badge';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import styles from './Topics.module.css';

export default function TopicsList() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Topics</h1>
        <p className={styles.sub}>Choose a subject to explore</p>
      </div>

      <div className={styles.grid}>
        {TOPICS.map((topic, i) => {
          const meta = TOPIC_META[topic.id] || {};
          return (
            <AnimatedBox key={topic.id} animation="slide-up" delay={i * 50}>
              <Card
                variant="elevated"
                hoverable
                className={styles.card}
                onClick={() => navigate(`/topics/${topic.id}`)}
              >
                <CardHeader
                  icon={topic.icon}
                  title={topic.label}
                  subtitle={`${topic.subtopics.length} modules`}
                />
                <CardBody>
                  <p className={styles.desc}>{meta.desc}</p>
                  <div className={styles.tags}>
                    {topic.subtopics.slice(0, 4).map((sub) => (
                      <Badge key={sub} variant={meta.color || 'default'} size="xs">{sub}</Badge>
                    ))}
                    {topic.subtopics.length > 4 && (
                      <Badge variant="default" size="xs">+{topic.subtopics.length - 4}</Badge>
                    )}
                  </div>
                </CardBody>
              </Card>
            </AnimatedBox>
          );
        })}
      </div>
    </div>
  );
}
