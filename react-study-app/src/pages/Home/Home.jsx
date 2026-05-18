import { useState } from 'react';
import Card, { CardHeader, CardBody } from '../../components/shared/Card/Card';
import Badge from '../../components/shared/Badge/Badge';
import Button from '../../components/shared/Button/Button';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import ArrayVisualizer from '../../components/visualizers/ArrayVisualizer/ArrayVisualizer';
import { SimulationProvider } from '../../core/context/SimulationContext';
import { TOPICS } from '../../core/constants/topics';
import styles from './Home.module.css';

const STATS = [
  { label: 'Topics', value: '8', icon: '🧩', color: 'blue' },
  { label: 'Visualizers', value: '40+', icon: '🎨', color: 'green' },
  { label: 'Systems', value: '12', icon: '🏗️', color: 'yellow' },
  { label: 'Algorithms', value: '50+', icon: '⚡', color: 'purple' },
];

export default function Home({ onSelectTopic }) {
  const [activeDemo, setActiveDemo] = useState('array');

  return (
    <div className={styles.page}>
      {/* === HERO === */}
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
            <Button variant="gradient" size="lg" icon="🚀">
              Start Learning
            </Button>
            <Button variant="secondary" size="lg" icon="🎮">
              Interview Mode
            </Button>
          </div>
        </AnimatedBox>
      </section>

      {/* === STATS === */}
      <section className={styles.stats}>
        {STATS.map((s, i) => (
          <AnimatedBox key={s.label} animation="bounce-in" delay={i * 60}>
            <Card variant="elevated" className={styles.statCard}>
              <span className={styles.statIcon}>{s.icon}</span>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </Card>
          </AnimatedBox>
        ))}
      </section>

      {/* === LIVE DEMO === */}
      <section className={styles.demoSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Live Demo</h2>
          <p className={styles.sectionSub}>Step through algorithms interactively</p>
        </div>

        <div className={styles.demoTabs}>
          {['array', 'graph', 'jvm'].map((tab) => (
            <button
              key={tab}
              className={`${styles.demoTab} ${activeDemo === tab ? styles.activeTab : ''}`}
              onClick={() => setActiveDemo(tab)}
            >
              {tab === 'array' && '📊 Array'}
              {tab === 'graph' && '🕸️ Graph'}
              {tab === 'jvm' && '☕ JVM'}
            </button>
          ))}
        </div>

        {activeDemo === 'array' && (
          <SimulationProvider>
            <ArrayVisualizer arr={[2, 1, 5, 1, 3, 2]} k={3} />
          </SimulationProvider>
        )}

        {activeDemo !== 'array' && (
          <Card className={styles.comingSoon}>
            <CardBody>
              <p>🚧 {activeDemo.toUpperCase()} visualizer coming soon…</p>
            </CardBody>
          </Card>
        )}
      </section>

      {/* === TOPICS GRID === */}
      <section className={styles.topicsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Topics</h2>
          <p className={styles.sectionSub}>Click any topic to explore</p>
        </div>
        <div className={styles.topicsGrid}>
          {TOPICS.map((topic, i) => (
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
                      <Badge key={sub} variant="default" size="xs">{sub}</Badge>
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

      {/* === VISUAL MODES === */}
      <section className={styles.modesSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Visual Modes</h2>
          <p className={styles.sectionSub}>Switch themes to match your vibe</p>
        </div>
        <div className={styles.modesGrid}>
          {[
            { name: 'ByteByteGo', desc: 'Dark architecture flows', icon: '🌌' },
            { name: 'Miro', desc: 'Infinite whiteboard canvas', icon: '🎨' },
            { name: 'Terminal', desc: 'Matrix green on black', icon: '💻' },
            { name: 'Cyberpunk', desc: 'Neon holographic UI', icon: '⚡' },
          ].map((mode, i) => (
            <AnimatedBox key={mode.name} animation="fade-in" delay={i * 80}>
              <Card variant="glass" className={styles.modeCard}>
                <span className={styles.modeIcon}>{mode.icon}</span>
                <span className={styles.modeName}>{mode.name}</span>
                <span className={styles.modeDesc}>{mode.desc}</span>
              </Card>
            </AnimatedBox>
          ))}
        </div>
      </section>
    </div>
  );
}
