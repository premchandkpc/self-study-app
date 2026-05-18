import { useRef, useEffect } from 'react';
import styles from './AnimatedBox.module.css';

export default function AnimatedBox({
  children,
  animation = 'slide-up',
  delay = 0,
  duration = 350,
  className = '',
  style = {},
  color,
  pulse,
  breathe,
  glow,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.animationDelay = `${delay}ms`;
    el.style.animationDuration = `${duration}ms`;
  }, [delay, duration]);

  const classes = [
    styles.box,
    styles[`anim-${animation}`],
    pulse ? styles.pulse : '',
    breathe ? styles.breathe : '',
    glow ? styles[`glow-${glow}`] : '',
    className,
  ].filter(Boolean).join(' ');

  const inlineStyle = {
    ...style,
    ...(color ? { '--box-color': color } : {}),
  };

  return (
    <div ref={ref} className={classes} style={inlineStyle}>
      {children}
    </div>
  );
}
