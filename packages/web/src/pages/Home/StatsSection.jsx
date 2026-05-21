import { memo } from 'react';
import Card from '../../components/shared/Card/Card';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import styles from './Home.module.css';

const STATS = [
  { label: 'Topics', value: 'N', icon: '🧩', color: 'blue' },
  { label: 'Subtopics', value: 'N', icon: '🎨', color: 'green' },
  { label: 'Systems', value: 'N', icon: '🏗️', color: 'yellow' },
  { label: 'Algorithms', value: '50+', icon: '⚡', color: 'purple' },
];

export const StatsSection = memo(function StatsSection({ topicCount, vizCount }) {
  const stats = [
    { ...STATS[0], value: String(topicCount) },
    { ...STATS[1], value: String(vizCount) },
    { ...STATS[2], value: String(topicCount) },
    STATS[3],
  ];
  return (
    <section className={styles.stats}>
      {stats.map((s, i) => (
        <AnimatedBox key={s.label} animation="bounce-in" delay={i * 60}>
          <Card variant="elevated" className={styles.statCard}>
            <span className={styles.statIcon}>{s.icon}</span>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </Card>
        </AnimatedBox>
      ))}
    </section>
  );
});
