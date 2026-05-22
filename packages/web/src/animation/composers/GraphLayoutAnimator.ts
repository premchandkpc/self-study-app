import type { AnimationDescriptor } from '../primitives'
import { createAnimation } from '../primitives'
import type { Position } from '../physics/Spring'

export class GraphLayoutAnimator {
  animateTransition(
    oldLayout: Map<string, Position>,
    newLayout: Map<string, Position>,
    duration: number = 500,
  ): AnimationDescriptor {
    const targetIds = Array.from(newLayout.keys())
    const props = targetIds.map(id => {
      const old = oldLayout.get(id) ?? { x: 0, y: 0 }
      const next = newLayout.get(id)!
      return [
        { property: `${id}.x`, from: old.x, to: next.x, interpolator: 'ease' as const },
        { property: `${id}.y`, from: old.y, to: next.y, interpolator: 'ease' as const },
      ]
    }).flat()

    return {
      ...createAnimation('move', targetIds, duration, { easing: 'ease-in-out' }),
      properties: props,
      keyframes: [
        { time: 0, properties: {} },
        { time: 1, properties: {} },
      ],
    }
  }

  animateHighlight(
    targetIds: string[],
    color: string = '#fbbf24',
    duration: number = 300,
  ): AnimationDescriptor {
    return {
      ...createAnimation('highlight', targetIds, duration, { easing: 'ease-out' }),
      properties: [
        { property: 'color', from: '#3b82f6', to: color, interpolator: 'linear' },
        { property: 'scale', from: 1, to: 1.15, interpolator: 'ease' },
      ],
      keyframes: [
        { time: 0, properties: {} },
        { time: 0.5, properties: { color, scale: 1.15 } },
        { time: 1, properties: { color: '#3b82f6', scale: 1 } },
      ],
    }
  }

  animatePacketFlow(
    fromId: string,
    toId: string,
    duration: number = 800,
  ): AnimationDescriptor {
    return {
      ...createAnimation('packet-flow', [fromId, toId], duration, { easing: 'ease-in-out' }),
      properties: [
        { property: 'flowProgress', from: 0, to: 1, interpolator: 'ease-in-out' },
      ],
      keyframes: [
        { time: 0, properties: { flowProgress: 0, opacity: 0 } },
        { time: 0.1, properties: { opacity: 1 } },
        { time: 0.9, properties: { opacity: 1 } },
        { time: 1, properties: { flowProgress: 1, opacity: 0 } },
      ],
    }
  }
}
