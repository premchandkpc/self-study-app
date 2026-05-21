import Card from '../Card/Card';
import styles from './LearningResources.module.css';

export default function LearningResources({ resources }) {
  if (!resources || resources.length === 0) return null;

  return (
    <div className={styles.section}>
      <h3 className={styles.title}>📖 Learning Resources</h3>
      <div className={styles.grid}>
        {resources.map((resource, i) => (
          <Card key={i} variant="default" className={styles.resourceCard}>
            <span className={styles.resourceIcon}>{resource.icon}</span>
            <div className={styles.resourceContent}>
              <h4 className={styles.resourceName}>{resource.name}</h4>
              <p className={styles.resourceDesc}>{resource.desc}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
