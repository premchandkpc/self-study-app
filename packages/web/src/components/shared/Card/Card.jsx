import styles from './Card.module.css';

export default function Card({
  children,
  className = '',
  variant = 'default',
  glow,
  hoverable,
  onClick,
  padding = 'md',
}) {
  const classes = [
    styles.card,
    styles[`variant-${variant}`],
    styles[`padding-${padding}`],
    glow ? styles[`glow-${glow}`] : '',
    hoverable ? styles.hoverable : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick} role={onClick ? 'button' : undefined}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon, action }) {
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        {icon && <span className={styles.headerIcon}>{icon}</span>}
        <div>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>
      {action && <div className={styles.headerAction}>{action}</div>}
    </div>
  );
}

export function CardBody({ children }) {
  return <div className={styles.body}>{children}</div>;
}

export function CardFooter({ children }) {
  return <div className={styles.footer}>{children}</div>;
}
