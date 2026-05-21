import Card, { CardHeader } from '../Card/Card';
import styles from './CaseStudy.module.css';

export default function CaseStudy({ name, caseStudy }) {
  if (!caseStudy) return null;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{name}</h2>

      {caseStudy.components && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>🏗️ Architecture Components</h3>
          <div className={styles.componentGrid}>
            {caseStudy.components.map((comp, i) => (
              <Card key={i} variant="default" className={styles.componentCard}>
                <h4 className={styles.componentName}>{comp.name}</h4>
                <p className={styles.componentDesc}>{comp.desc}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {caseStudy.flow && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>🔄 Request Flow</h3>
          <div className={styles.flowSteps}>
            {caseStudy.flow.map((step, i) => (
              <div key={i} className={styles.flowStep}>
                <div className={styles.stepNumber}>{i + 1}</div>
                <p className={styles.stepText}>{step}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {caseStudy.challenges && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>⚡ Key Challenges</h3>
          <ul className={styles.challengeList}>
            {caseStudy.challenges.map((challenge, i) => (
              <li key={i} className={styles.challengeItem}>{challenge}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
