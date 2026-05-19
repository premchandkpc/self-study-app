import { useState, useCallback, useRef } from 'react';

export function useSvgHover() {
  const [hovered, setHovered] = useState(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  function onHover(kind, data, active, e) {
    if (active) {
      const rect = e?.currentTarget?.closest('svg')?.getBoundingClientRect?.();
      const mx = rect ? e.clientX - rect.left : mouseRef.current.x;
      const my = rect ? e.clientY - rect.top : mouseRef.current.y;
      mouseRef.current = { x: mx, y: my };
      setHovered({ kind, data, mouseX: mx, mouseY: my });
    } else {
      setHovered(null);
    }
  }

  function bindHover(kind, data) {
    return {
      onMouseEnter: (e) => onHover(kind, data, true, e),
      onMouseMove: (e) => {
        const rect = e.currentTarget.closest('svg')?.getBoundingClientRect();
        if (rect) {
          mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          setHovered(h => h && h.kind === kind && h.data === data
            ? { ...h, mouseX: mouseRef.current.x, mouseY: mouseRef.current.y }
            : h);
        }
      },
      onMouseLeave: () => onHover(kind, data, false),
    };
  }

  function isHovered(kind, data) {
    return hovered?.kind === kind && hovered?.data === data;
  }

  return { hovered, setHovered, onHover, bindHover, isHovered };
}
