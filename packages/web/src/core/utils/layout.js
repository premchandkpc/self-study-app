export function rowLayout(n, { startX = 100, y = 200, gapX = 140 } = {}) {
  return Array.from({ length: n }, (_, i) => ({ x: startX + i * gapX, y }));
}

export function columnLayout(n, { x = 100, startY = 80, gapY = 100 } = {}) {
  return Array.from({ length: n }, (_, i) => ({ x, y: startY + i * gapY }));
}

export function gridLayout(n, { cols = 3, startX = 80, startY = 80, gapX = 140, gapY = 100 } = {}) {
  return Array.from({ length: n }, (_, i) => ({
    x: startX + (i % cols) * gapX,
    y: startY + Math.floor(i / cols) * gapY,
  }));
}

export function circularLayout(n, { cx = 350, cy = 190, r = 130 } = {}) {
  return Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: Math.round(cx + r * Math.cos(angle)), y: Math.round(cy + r * Math.sin(angle)) };
  });
}

export function pipelineLayout(labels, { startX = 80, y = 190, gapX = 150 } = {}) {
  return labels.map((label, i) => ({ id: label, label, x: startX + i * gapX, y }));
}

export function fitToViewport(nodes, { w = 700, h = 380, padding = 60 } = {}) {
  if (!nodes.length) return nodes;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scaleX = (w - padding * 2) / rangeX;
  const scaleY = (h - padding * 2) / rangeY;
  const scale = Math.min(scaleX, scaleY, 1);
  return nodes.map((n) => ({
    ...n,
    x: Math.round(padding + (n.x - minX) * scale),
    y: Math.round(padding + (n.y - minY) * scale),
  }));
}
