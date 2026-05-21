import styles from './Loading.module.css';

export default function Loading({ size = 'md', label, fullscreen }) {
  const el = (
    <div className={`${styles.wrapper} ${fullscreen ? styles.fullscreen : ''}`}>
      <div className={`${styles.spinner} ${styles[`size-${size}`]}`}>
        <div className={styles.ring} />
        <div className={styles.core} />
      </div>
      {label && <p className={styles.label}>{label}</p>}
    </div>
  );
  return el;
}

export function LoadingDots() {
  return (
    <span className={styles.dots}>
      <span /><span /><span />
    </span>
  );
}
