import { useEffect, useRef } from 'react';
import styles from './MetricsPanel.module.css';

export default function MetricsPanel({ metrics = [] }) {
  return (
    <div className={styles.panel}>
      {metrics.map((m) => (
        <MetricGauge key={m.label} {...m} />
      ))}
    </div>
  );
}

function MetricGauge({ label, value, max = 100, unit = '', color, warn, critical }) {
  const pct = Math.min(100, (value / max) * 100);
  const barColor = critical && pct >= critical
    ? 'var(--text-error)'
    : warn && pct >= warn
    ? 'var(--text-warn)'
    : color || 'var(--node-default)';

  return (
    <div className={styles.gauge}>
      <div className={styles.gaugeHeader}>
        <span className={styles.gaugeLabel}>{label}</span>
        <span className={styles.gaugeValue} style={{ color: barColor }}>
          <AnimatedNumber value={value} />{unit}
        </span>
      </div>
      <div className={styles.gaugeTrack}>
        <div
          className={styles.gaugeFill}
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

function AnimatedNumber({ value }) {
  const ref = useRef(null);
  const prev = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || prev.current === value) return;
    const start = prev.current;
    const end = value;
    const duration = 400;
    const t0 = performance.now();

    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      el.textContent = Math.round(start + (end - start) * easeOut(p));
      if (p < 1) requestAnimationFrame(tick);
      else prev.current = end;
    };
    requestAnimationFrame(tick);
  }, [value]);

  return <span ref={ref}>{value}</span>;
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}
