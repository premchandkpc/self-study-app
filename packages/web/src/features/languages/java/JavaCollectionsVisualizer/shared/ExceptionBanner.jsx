import { memo } from 'react';
import styles from '../JavaCollectionsVisualizer.module.css';

export const ExceptionBanner = memo(function ExceptionBanner({ exception }) {
  if (!exception) return null;
  return (
    <div className={styles.exceptionBanner}>
      <span className={styles.excIcon}>💥</span>
      <div>
        <div className={styles.excType}>{exception.type}</div>
        <div className={styles.excMsg}>{exception.msg}</div>
      </div>
    </div>
  );
});
