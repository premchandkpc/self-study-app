import { R2Object } from '../core/R2Object'
import { Int, Str } from './Primitives'

export function Server(name: string, status: string = 'healthy'): R2Object {
  const s = new R2Object('server', 'system', { color: '#3b82f6', w: 100, h: 70 }).label(name)
  s.set('status', status).set('hostname', name).set('port', 8080).set('connections', 0)
  const cpuBar = new R2Object('metric', 'system', { color: '#60a5fa', w: 80, h: 8 }).pos(10, 45).set('label', 'CPU').set('pct', 45)
  const memBar = new R2Object('metric', 'system', { color: '#93c5fd', w: 80, h: 8 }).pos(10, 55).set('label', 'MEM').set('pct', 62)
  s.addChild(cpuBar).addChild(memBar)
  return s
}

export function Database(name: string, type: string = 'postgres'): R2Object {
  const db = new R2Object('database', 'system', { color: '#f59e0b', w: 90, h: 80 }).label(name)
  db.set('type', type).set('status', 'primary').set('connections', 12).set('qps', 450)
  const cylinder = new R2Object('db-icon', 'system', { color: '#fbbf24', w: 60, h: 40 }).pos(15, 10).label('DB')
  db.addChild(cylinder)
  return db
}

export function LoadBalancer(name: string): R2Object {
  const lb = new R2Object('load-balancer', 'system', { color: '#8b5cf6', w: 120, h: 60 }).label(name)
  lb.set('algorithm', 'round-robin').set('connections', 0).set('healthy', true)
  return lb
}

export function Queue(name: string, type: string = 'kafka'): R2Object {
  const q = new R2Object('queue', 'system', { color: '#ec4899', w: 100, h: 60 }).label(name)
  q.set('type', type).set('partitions', 3).set('messages', 0).set('lag', 0)
  return q
}

export function Cache(name: string): R2Object {
  const c = new R2Object('cache', 'system', { color: '#14b8a6', w: 80, h: 60 }).label(name)
  c.set('type', 'redis').set('hitRate', 95).set('memory', '2GB').set('keys', 0)
  return c
}

export function Worker(name: string): R2Object {
  const w = new R2Object('worker', 'system', { color: '#f97316', w: 80, h: 60 }).label(name)
  w.set('status', 'idle').set('tasks', 0).set('cpu', 0).set('memory', 128)
  return w
}

export function APIGateway(name: string): R2Object {
  const g = new R2Object('api-gateway', 'system', { color: '#06b6d4', w: 120, h: 60 }).label(name)
  g.set('routes', 12).set('rateLimit', 1000).set('latency', '5ms')
  return g
}

export function Microservice(name: string): R2Object {
  const ms = new R2Object('microservice', 'system', { color: '#10b981', w: 90, h: 60 }).label(name)
  ms.set('instances', 3).set('version', 'v2').set('status', 'healthy')
  const container = new R2Object('container', 'system', { color: '#34d399', w: 60, h: 30 }).pos(15, 20).label('container')
  ms.addChild(container)
  return ms
}

export function MicroserviceSystem(): R2Object {
  const system = new R2Object('system-arch', 'system', { color: '#1e293b', w: 700, h: 500 }).label('Microservice Architecture').pos(20, 20)
  const gw = APIGateway('API Gateway').pos(280, 10)
  const lb = LoadBalancer('LB').pos(280, 90)
  const s1 = Microservice('User Service').pos(60, 180)
  const s2 = Microservice('Order Service').pos(200, 180)
  const s3 = Microservice('Payment Service').pos(340, 180)
  const s4 = Microservice('Notification').pos(480, 180)
  const db1 = Database('User DB', 'postgres').pos(80, 300)
  const db2 = Database('Order DB', 'postgres').pos(220, 300)
  const cache = Cache('Redis').pos(380, 300)
  const queue = Queue('RabbitMQ').pos(520, 300)
  system.addChild(gw).addChild(lb).addChild(s1).addChild(s2).addChild(s3).addChild(s4)
  system.addChild(db1).addChild(db2).addChild(cache).addChild(queue)
  return system
}
