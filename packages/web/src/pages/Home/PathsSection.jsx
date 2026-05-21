import { memo } from 'react';
import Card from '../../components/shared/Card/Card';
import Button from '../../components/shared/Button/Button';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import styles from './Home.module.css';

const PATHS = [
  { title: 'System Design Interview', emoji: '🏗️', desc: 'Learn to design Uber, load balancers, and distributed systems', cta: 'Explore System Design' },
  { title: 'Coding Interview Prep', emoji: '💻', desc: 'Master algorithms, data structures, and optimize solutions', cta: 'Start with DSA' },
  { title: 'Backend Fundamentals', emoji: '⚙️', desc: 'Understand Java, Kafka, Kubernetes, and AWS', cta: 'Learn Backend' },
  { title: 'Practice Mode', emoji: '🎯', desc: 'Test yourself with flashcards and interview questions', cta: 'Go to Interview Mode' },
];

export const PathsSection = memo(function PathsSection() {
  return (
    <section className={styles.gettingStartedSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>🚀 Getting Started</h2>
        <p className={styles.sectionSub}>Choose your learning path</p>
      </div>
      <div className={styles.pathsGrid}>
        {PATHS.map((path, i) => (
          <AnimatedBox key={i} animation="slide-up" delay={i * 40}>
            <Card variant="elevated" className={styles.pathCard}>
              <div className={styles.pathIcon}>{path.emoji}</div>
              <h3 className={styles.pathTitle}>{path.title}</h3>
              <p className={styles.pathDesc}>{path.desc}</p>
              <Button variant="secondary" size="sm">{path.cta}</Button>
            </Card>
          </AnimatedBox>
        ))}
      </div>
    </section>
  );
});
