import { memo } from 'react';
import Card from '../../components/shared/Card/Card';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import styles from './Home.module.css';

const FEATURES = [
  { icon: '▶️', title: 'Step-by-Step Execution', desc: 'Pause and play through every operation, watch variables change in real-time' },
  { icon: '📊', title: 'Live Data Structures', desc: 'See arrays, trees, graphs, heaps transform as algorithms execute' },
  { icon: '🎯', title: 'Learn by Doing', desc: 'Interactive visualizers let you experiment, modify inputs, test edge cases' },
  { icon: '💡', title: 'Understand Why', desc: 'Trace execution to understand performance characteristics and correctness' },
  { icon: '🔗', title: 'Real-World Systems', desc: 'From Kafka partitions to Kubernetes scheduling—learn how prod systems work' },
  { icon: '📚', title: 'Study Materials', desc: 'Learning objectives, key concepts, and code examples for every topic' },
];

export const FeaturesSection = memo(function FeaturesSection() {
  return (
    <section className={styles.featuresSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Why Visual Learning Works</h2>
        <p className={styles.sectionSub}>See algorithms and systems in action, not just theory</p>
      </div>
      <div className={styles.featuresGrid}>
        {FEATURES.map((feature, i) => (
          <AnimatedBox key={i} animation="slide-up" delay={i * 40}>
            <Card variant="elevated" className={styles.featureCard}>
              <span className={styles.featureIcon}>{feature.icon}</span>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDesc}>{feature.desc}</p>
            </Card>
          </AnimatedBox>
        ))}
      </div>
    </section>
  );
});
