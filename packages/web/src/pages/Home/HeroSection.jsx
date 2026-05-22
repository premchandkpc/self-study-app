import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/shared/Badge/Badge';
import Button from '../../components/shared/Button/Button';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import styles from './Home.module.css';

export const HeroSection = memo(function HeroSection() {
  const navigate = useNavigate();
  return (
    <section className={styles.hero}>
      <AnimatedBox animation="slide-up" delay={0}>
        <div className={styles.heroBadge}>
          <Badge variant="blue" dot pulse>Live Simulations</Badge>
          <Badge variant="green">Interactive</Badge>
          <Badge variant="purple">Visual-First</Badge>
        </div>
      </AnimatedBox>

      <AnimatedBox animation="slide-up" delay={80}>
        <h1 className={styles.heroTitle}>
          Learn Systems <span className={styles.heroAccent}>Visually</span>
        </h1>
      </AnimatedBox>

      <AnimatedBox animation="slide-up" delay={160}>
        <p className={styles.heroSubtitle}>
          Not static diagrams. Living distributed system simulations.
          DSA · Java · Go · Kubernetes · Kafka · AWS · System Design.
        </p>
      </AnimatedBox>

      <AnimatedBox animation="slide-up" delay={240}>
        <div className={styles.heroActions}>
          <Button variant="gradient" size="lg" icon="🚀" onClick={() => navigate('/topics')}>
            Start Learning
          </Button>
          <Button variant="secondary" size="lg" icon="📚" onClick={() => navigate('/study-hub')}>
            Deep Dive Guide
          </Button>
          <Button variant="secondary" size="lg" icon="🏗️" onClick={() => navigate('/sd')}>
            System Design
          </Button>
          <Button variant="secondary" size="lg" icon="🎮" onClick={() => navigate('/topic/dsa/arrays')}>
            Try Visualizer
          </Button>
        </div>
      </AnimatedBox>
    </section>
  );
});
