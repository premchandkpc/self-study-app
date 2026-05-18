import styles from './Badge.module.css';

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot,
  pulse,
  className = '',
}) {
  const classes = [
    styles.badge,
    styles[`variant-${variant}`],
    styles[`size-${size}`],
    pulse ? styles.pulse : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  );
}
