import styles from './StudyGuide.module.css';

export default function StudyGuide({ objectives, keyTopics }) {
  return (
    <div className={styles.guide}>
      {objectives && (
        <section className={styles.section}>
          <h3 className={styles.title}>📚 Learning Objectives</h3>
          <ul className={styles.list}>
            {objectives.map((obj, i) => (
              <li key={i} className={styles.item}>{obj}</li>
            ))}
          </ul>
        </section>
      )}

      {keyTopics && (
        <section className={styles.section}>
          <h3 className={styles.title}>🔑 Key Topics</h3>
          <div className={styles.tags}>
            {keyTopics.map((topic, i) => (
              <span key={i} className={styles.tag}>{topic}</span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
