import { memo } from 'react';
import Card from '../../components/shared/Card/Card';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import styles from './Home.module.css';

const MODES = [
  { name: 'ByteByteGo', desc: 'Distributed systems architecture flows', icon: '🌌' },
  { name: 'Miro', desc: 'Infinite collaborative whiteboard canvas', icon: '🎨' },
  { name: 'Brilliant', desc: 'Interactive visual learning experience', icon: '🧠' },
  { name: 'Terminal', desc: 'Classic hacker terminal aesthetics', icon: '💻' },
  { name: 'Cyberpunk', desc: 'Neon holographic futuristic runtime UI', icon: '⚡' },
  { name: 'Obsidian', desc: 'Premium dark observability platform', icon: '🪨' },
  { name: 'Graphite', desc: 'Minimal gray engineering workspace', icon: '⬛' },
  { name: 'Mono', desc: 'Black and white ultra-clean architecture', icon: '⚪' },
  { name: 'Midnight', desc: 'Deep dark runtime systems universe', icon: '🌑' },
  { name: 'Slate', desc: 'Modern cloud-native infrastructure UI', icon: '🩶' },
  { name: 'Polar', desc: 'Bright clean system design canvas', icon: '❄️' },
  { name: 'PaperLight', desc: 'Soft Figma-style minimal workspace', icon: '📄' },
  { name: 'Glass', desc: 'Transparent glassmorphism runtime UI', icon: '🪟' },
  { name: 'Nebula', desc: 'AI orchestration cosmic interface', icon: '🌌' },
  { name: 'Aurora', desc: 'Gradient neon observability aesthetics', icon: '🌈' },
];

export const ModesSection = memo(function ModesSection() {
  return (
    <section className={styles.modesSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Visual Modes</h2>
        <p className={styles.sectionSub}>Switch themes to match your vibe</p>
      </div>
      <div className={styles.modesGrid}>
        {MODES.map((mode, i) => (
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
  );
});
