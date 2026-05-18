import { useState, useRef } from 'react';
import styles from './Tooltip.module.css';

export default function Tooltip({ children, content, placement = 'top', delay = 0 }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  function show() {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }

  function hide() {
    clearTimeout(timerRef.current);
    setVisible(false);
  }

  if (!content) return children;

  return (
    <div className={styles.wrapper} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div className={`${styles.tooltip} ${styles[placement]}`} role="tooltip">
          {content}
          <span className={styles.arrow} />
        </div>
      )}
    </div>
  );
}
