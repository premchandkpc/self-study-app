import { useRef, useCallback } from 'react';

export function useAnimation() {
  const frameRef = useRef(null);

  const animate = useCallback((fn, duration = 300) => {
    return new Promise((resolve) => {
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        fn(easeInOut(progress));
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      frameRef.current = requestAnimationFrame(tick);
    });
  }, []);

  const cancel = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  }, []);

  return { animate, cancel };
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
