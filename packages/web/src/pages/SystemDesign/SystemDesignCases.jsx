import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/shared/Button/Button';
import Card from '../../components/shared/Card/Card';
import CaseStudy from '../../components/shared/CaseStudy/CaseStudy';
import AnimatedBox from '../../components/shared/AnimatedBox/AnimatedBox';
import styles from '../Topics/Topics.module.css';

export default function SystemDesignCases() {
  const navigate = useNavigate();
  const [selectedCase, setSelectedCase] = useState('Uber');

  const caseStudies = TOPIC_EXPLANATIONS['systemdesign']?.casestudies || {};
  const cases = Object.keys(caseStudies);

  if (cases.length === 0) {
    return (
      <div className={styles.page}>
        <p className={styles.sub}>No case studies found.</p>
        <Button variant="secondary" onClick={() => navigate('/topics')}>← Back to Topics</Button>
      </div>
    );
  }

  const currentCase = caseStudies[selectedCase];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/sd')}>
          ← System Design
        </Button>
        <h1 className={styles.title}>System Design Case Studies</h1>
        <p className={styles.sub}>Real-world system design for Uber, WhatsApp, Instagram, YouTube. Learn how scale impacts every decision.</p>
      </div>

      {/* Case selector */}
      <div className={styles.caseSelector}>
        {cases.map((caseKey, i) => (
          <AnimatedBox key={caseKey} animation="slide-up" delay={i * 40}>
            <Card
              variant={selectedCase === caseKey ? "elevated" : "default"}
              hoverable
              className={selectedCase === caseKey ? styles.caseCardActive : styles.caseCard}
              onClick={() => setSelectedCase(caseKey)}
            >
              <div className={styles.caseIcon}>
                {caseKey === 'Uber' && '🚗'}
                {caseKey === 'WhatsApp' && '💬'}
                {caseKey === 'Instagram' && '📸'}
                {caseKey === 'YouTube' && '🎥'}
              </div>
              <h3 className={styles.caseName}>{caseKey}</h3>
            </Card>
          </AnimatedBox>
        ))}
      </div>

      {/* Case study content */}
      {currentCase && <CaseStudy name={selectedCase} caseStudy={currentCase} />}
    </div>
  );
}
