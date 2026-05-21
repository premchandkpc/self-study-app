import Button from '../Button/Button';
import styles from './DetailPageHeader.module.css';

export default function DetailPageHeader({ backLabel, onBack, icon, title, desc }) {
  return (
    <div className={styles.detailHeader}>
      <Button variant="ghost" size="sm" onClick={onBack}>
        ← {backLabel}
      </Button>
      <div className={styles.detailTitle}>
        <span className={styles.detailIcon}>{icon}</span>
        <div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.sub}>{desc}</p>
        </div>
      </div>
    </div>
  );
}
