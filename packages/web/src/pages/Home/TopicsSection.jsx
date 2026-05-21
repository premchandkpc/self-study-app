import { memo } from 'react';
import Card, { CardHeader, CardBody } from '../../components/shared/Card/Card';
import Badge from '../../components/shared/Badge/Badge';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import styles from './Home.module.css';

export const TopicsSection = memo(function TopicsSection({ topics = [], onSelectTopic }) {
  return (
    <section className={styles.topicsSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>All Topics</h2>
        <p className={styles.sectionSub}>Choose a topic and explore subtopics with interactive visualizations</p>
      </div>
      <div className={styles.topicsGrid}>
        {topics.map((topic, i) => (
          <AnimatedBox key={topic.id} animation="slide-up" delay={i * 50}>
            <Card
              variant="elevated"
              hoverable
              className={styles.topicCard}
              onClick={() => onSelectTopic?.({ topicId: topic.id })}
            >
              <CardHeader
                icon={topic.icon}
                title={topic.label}
                subtitle={`${topic.subtopics.length} modules`}
              />
              <CardBody>
                <div className={styles.subtopicTags}>
                  {topic.subtopics.slice(0, 3).map((sub) => (
                    <Badge key={sub.slug || sub.name} variant="default" size="xs">{sub.name}</Badge>
                  ))}
                  {topic.subtopics.length > 3 && (
                    <Badge variant="default" size="xs">+{topic.subtopics.length - 3}</Badge>
                  )}
                </div>
              </CardBody>
            </Card>
          </AnimatedBox>
        ))}
      </div>
    </section>
  );
});
