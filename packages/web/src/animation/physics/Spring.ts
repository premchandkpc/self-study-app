export interface SpringConfig {
  stiffness: number
  damping: number
  mass: number
}

export interface ForceConfig {
  repulsion: number
  attraction: number
  damping: number
  iterations: number
}

export interface Position {
  x: number
  y: number
}

export class SpringSystem {
  stiffness: number
  damping: number
  mass: number
  private velocity: number = 0

  constructor(config?: Partial<SpringConfig>) {
    this.stiffness = config?.stiffness ?? 180
    this.damping = config?.damping ?? 12
    this.mass = config?.mass ?? 1
  }

  compute(current: number, target: number, dt: number): number {
    const force = -this.stiffness * (current - target) - this.damping * this.velocity
    const acceleration = force / this.mass
    this.velocity += acceleration * dt
    return current + this.velocity * dt
  }

  computeWithConfig(current: number, target: number, dt: number, config: SpringConfig): number {
    const force = -config.stiffness * (current - target) - config.damping * this.velocity
    const acceleration = force / config.mass
    this.velocity += acceleration * dt
    return current + this.velocity * dt
  }

  computeArrivalTime(current: number, target: number, threshold: number = 0.5): number {
    let pos = current, vel = 0, t = 0
    const dt = 0.016
    while (Math.abs(pos - target) > threshold && t < 10) {
      const force = -this.stiffness * (pos - target) - this.damping * vel
      const acc = force / this.mass
      vel += acc * dt
      pos += vel * dt
      t += dt
    }
    return t
  }

  reset(): void {
    this.velocity = 0
  }

  forceLayout(
    nodes: { id: string; x: number; y: number }[],
    edges: { from: string; to: string }[],
    config?: Partial<ForceConfig>,
  ): Map<string, Position> {
    const cfg: ForceConfig = {
      repulsion: config?.repulsion ?? 1000,
      attraction: config?.attraction ?? 0.01,
      damping: config?.damping ?? 0.85,
      iterations: config?.iterations ?? 100,
    }

    const positions = new Map<string, Position>()
    const velocities = new Map<string, { vx: number; vy: number }>()
    for (const node of nodes) {
      positions.set(node.id, { x: node.x + (Math.random() - 0.5) * 10, y: node.y + (Math.random() - 0.5) * 10 })
      velocities.set(node.id, { vx: 0, vy: 0 })
    }

    for (let iter = 0; iter < cfg.iterations; iter++) {
      const forces = new Map<string, { fx: number; fy: number }>()
      for (const id of positions.keys()) forces.set(id, { fx: 0, fy: 0 })

      const posArr = Array.from(positions.entries())
      for (let i = 0; i < posArr.length; i++) {
        for (let j = i + 1; j < posArr.length; j++) {
          const [idA, posA] = posArr[i], [idB, posB] = posArr[j]
          let dx = posB.x - posA.x, dy = posB.y - posA.y
          let dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = cfg.repulsion / (dist * dist)
          dx /= dist; dy /= dist
          forces.get(idA)!.fx -= force * dx
          forces.get(idA)!.fy -= force * dy
          forces.get(idB)!.fx += force * dx
          forces.get(idB)!.fy += force * dy
        }
      }

      for (const edge of edges) {
        const a = positions.get(edge.from), b = positions.get(edge.to)
        if (!a || !b) continue
        let dx = b.x - a.x, dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = cfg.attraction * (dist - 100)
        dx /= dist; dy /= dist
        forces.get(edge.from)!.fx += force * dx
        forces.get(edge.from)!.fy += force * dy
        forces.get(edge.to)!.fx -= force * dx
        forces.get(edge.to)!.fy -= force * dy
      }

      for (const [id, f] of forces) {
        const v = velocities.get(id)!
        v.vx = (v.vx + f.fx) * cfg.damping
        v.vy = (v.vy + f.fy) * cfg.damping
        const pos = positions.get(id)!
        pos.x += v.vx
        pos.y += v.vy
      }
    }

    return positions
  }
}
