import { useNavigate } from 'react-router-dom';
import { TOPICS } from '../../core/constants/topics';
import { TOPIC_META } from '../../core/constants/topicMeta';
import Card, { CardHeader, CardBody } from '../../components/shared/Card/Card';
import Badge from '../../components/shared/Badge/Badge';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import LearningResources from '../../components/shared/LearningResources/LearningResources';
import styles from './Topics.module.css';

export default function TopicsList() {
  const navigate = useNavigate();

  const learningResources = [
    { icon: '▶️', name: 'Interactive Visualizer', desc: 'Step through algorithms and data structures with full animation control' },
    { icon: '📚', name: 'Learning Objectives', desc: 'Clear learning goals and key concepts for each topic' },
    { icon: '💡', name: 'Study Guides', desc: 'Detailed explanations of algorithms, time complexity, and patterns' },
    { icon: '🎯', name: 'Code Examples', desc: 'Real code snippets with step-by-step execution tracing' },
    { icon: '📊', name: 'Live Simulations', desc: 'See data structure transformations in real-time' },
    { icon: '🔍', name: 'Edge Cases', desc: 'Explore corner cases and understand why they matter' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Topics</h1>
        <p className={styles.sub}>Learn through interactive visualizations. Click any topic to explore subtopics with step-by-step simulations and learning guides.</p>
      </div>

      <LearningResources resources={learningResources} />

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
