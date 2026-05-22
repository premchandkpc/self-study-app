import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DOCS } from '../../core/constants/docs';
import Card from '../../components/shared/Card/Card';
import Button from '../../components/shared/Button/Button';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import styles from './Home.module.css';

export const ReadSection = memo(function ReadSection() {
  const navigate = useNavigate();

  return (
    <section className={styles.gettingStartedSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>📖 Deep Dive Documents</h2>
        <p className={styles.sectionSub}>Full system design walkthroughs with production-grade architecture</p>
      </div>
      <div className={styles.pathsGrid}>
        {DOCS.map((doc, i) => (
          <AnimatedBox key={doc.slug} animation="slide-up" delay={i * 40}>
            <Card variant="elevated" className={styles.pathCard}>
              <div className={styles.pathIcon}>{doc.icon}</div>
              <h3 className={styles.pathTitle}>{doc.title}</h3>
              <p className={styles.pathDesc}>{doc.desc}</p>
              <Button variant="secondary" size="sm" onClick={() => navigate(`/read/${doc.slug}`)}>Read Document</Button>
            </Card>
          </AnimatedBox>
        ))}
      </div>
    </section>
  );
});
