import { useMemo } from 'react';
import { TimelineFrame } from '../runtime';

interface ArrayRendererProps {
  frame: TimelineFrame | null;
  array: number[];
  height?: number;
}

/**
 * Renders array as bars with visual feedback
 * Colors based on current events: compared, swapped, sorted, etc.
 */
export function ArrayRenderer({
  frame,
  array,
  height = 300
}: ArrayRendererProps) {
  const state = useMemo(() => {
    if (!frame) {
      return {
        compared: new Set<number>(),
        swapped: new Set<number>(),
        sorted: new Set<number>(),
        highlighted: new Set<number>()
      };
    }

    const compared = new Set<number>();
    const swapped = new Set<number>();
    const highlighted = new Set<number>();

    // Parse events to extract visual state
    for (const event of frame.events) {
      if (event.type === 'ARRAY_COMPARE' && event.indices) {
        event.indices.forEach((i: number) => compared.add(i));
      }
      if (event.type === 'ARRAY_SWAP' && event.indices) {
        event.indices.forEach((i: number) => swapped.add(i));
      }
      if (event.type === 'ARRAY_SET' && event.index !== undefined) {
        swapped.add(event.index);
      }
      if (event.type === 'HIGHLIGHT_START' && event.elementIds) {
        event.elementIds.forEach((id: string) => {
          const idx = parseInt(id);
          if (!isNaN(idx)) highlighted.add(idx);
        });
      }
    }

    return { compared, swapped, sorted: new Set<number>(), highlighted };
  }, [frame]);

  const maxValue = Math.max(...array);

  const getColor = (index: number): string => {
    if (state.swapped.has(index)) return '#dc2626'; // Bright red - just swapped
    if (state.compared.has(index)) return '#f97316'; // Bright orange - being compared
    if (state.highlighted.has(index)) return '#16a34a'; // Bright green - highlighted
    return '#2563eb'; // Bright blue - default
  };

  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '2px',
        padding: '1rem',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}
    >
      {array.map((value, index) => {
        const heightPercent = (value / maxValue) * 100;
        const color = getColor(index);
        const isCompared = state.compared.has(index);
        const isSwapped = state.swapped.has(index);

        return (
          <div
            key={index}
            style={{
              flex: 1,
              height: `${heightPercent}%`,
              background: color,
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              padding: '4px',
              color: 'white',
              fontSize: '11px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              boxShadow: isCompared ? '0 0 8px rgba(245, 158, 11, 0.6)' : 'none',
              transform: isSwapped ? 'scale(1.1)' : 'scale(1)',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}
          >
            {value}
          </div>
        );
      })}
    </div>
  );
}

export default ArrayRenderer;
