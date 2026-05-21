import Card from '../Card/Card';
import styles from './ExplanationCard.module.css';

export default function ExplanationCard({ topic, subtopic, data }) {
  if (!data) return null;

  return (
    <div className={styles.container}>
      <Card variant="elevated" className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>{subtopic}</h2>
        </div>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>💡 Explanation</h3>
          <p className={styles.text}>{data.explanation}</p>
        </section>

        {data.useCases && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>🎯 Use Cases</h3>
            <ul className={styles.list}>
              {data.useCases.map((useCase, i) => (
                <li key={i}>{useCase}</li>
              ))}
            </ul>
          </section>
        )}

        {data.realWorld && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>🌍 Real-World Example</h3>
            <p className={styles.highlight}>{data.realWorld}</p>
          </section>
        )}

        {data.complexity && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>⏱️ Complexity</h3>
            <div className={styles.complexity}>
              {Object.entries(data.complexity).map(([key, value]) => (
                <div key={key} className={styles.complexityItem}>
                  <span className={styles.complexityLabel}>{key}:</span>
                  <span className={styles.complexityValue}>{value}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </Card>
    </div>
  );
}
