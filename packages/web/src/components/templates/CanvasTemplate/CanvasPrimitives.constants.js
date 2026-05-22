import { ICONS, NODE_COLORS } from '../../../legacy/system-design/sd-types';

export const NODE_W = 108;
export const NODE_H = 54;

export const NODE_META = {
  ...Object.fromEntries(
    Object.entries(ICONS).map(([type, icon]) => [type, { color: NODE_COLORS[type] || 'var(--node-default)', icon }])
  ),
  default: { color: 'var(--node-default)', icon: '\u25CF' },
};

export function getLayerColors(index, _total) {
  const palette = [
    { fill: 'rgba(100,140,255,0.12)', border: 'rgba(100,140,255,0.45)' },
    { fill: 'rgba(255,160,50,0.12)',  border: 'rgba(255,160,50,0.50)' },
    { fill: 'rgba(60,200,120,0.12)',  border: 'rgba(60,200,120,0.42)' },
    { fill: 'rgba(80,190,220,0.12)',  border: 'rgba(80,190,220,0.42)' },
    { fill: 'rgba(190,110,220,0.12)', border: 'rgba(190,110,220,0.42)' },
    { fill: 'rgba(220,90,90,0.12)',   border: 'rgba(220,90,90,0.42)' },
    { fill: 'rgba(255,80,120,0.10)',  border: 'rgba(255,80,120,0.40)' },
    { fill: 'rgba(50,210,180,0.10)',  border: 'rgba(50,210,180,0.40)' },
  ];
  return palette[index % palette.length];
}
