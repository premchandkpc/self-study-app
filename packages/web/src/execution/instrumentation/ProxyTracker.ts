import type { RuntimeEvent } from '../../runtime/events/Event'
import type { TraceRecorder } from '../TraceRecorder'

export class ProxyTracker {
  private recorder: TraceRecorder
  private trackedObjects: WeakSet<object> = new WeakSet()

  constructor(recorder: TraceRecorder) {
    this.recorder = recorder
  }

  track<T extends object>(obj: T, name: string): T {
    if (this.trackedObjects.has(obj)) return obj

    const recorder = this.recorder
    const proxy = new Proxy(obj, {
      get(target, prop, receiver) {
        const val = Reflect.get(target, prop, receiver)
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          return new Proxy(val, {
            set(innerTarget, innerProp, innerValue) {
              const old = Reflect.get(innerTarget, innerProp)
              const result = Reflect.set(innerTarget, innerProp, innerValue)
              recorder.variableMutated(`${name}.${String(prop)}.${String(innerProp)}`, old, innerValue)
              return result
            },
            get(innerTarget, innerProp, innerReceiver) {
              const innerVal = Reflect.get(innerTarget, innerProp, innerReceiver)
              if (typeof innerVal === 'object' && innerVal !== null) {
                return new Proxy(innerVal, {
                  set(deepTarget, deepProp, deepValue) {
                    const old = Reflect.get(deepTarget, deepProp)
                    const result = Reflect.set(deepTarget, deepProp, deepValue)
                    recorder.variableMutated(`${name}.${String(prop)}.${String(innerProp)}.${String(deepProp)}`, old, deepValue)
                    return result
                  },
                })
              }
              return innerVal
            },
          })
        }
        return val
      },
      set(target, prop, value) {
        const old = Reflect.get(target, prop)
        const result = Reflect.set(target, prop, value)
        recorder.variableMutated(`${name}.${String(prop)}`, old, value)
        return result
      },
      deleteProperty(target, prop) {
        const old = Reflect.get(target, prop)
        const result = Reflect.deleteProperty(target, prop)
        recorder.variableMutated(`${name}.${String(prop)}`, old, undefined)
        return result
      },
    })

    this.trackedObjects.add(proxy)
    return proxy
  }

  trackArray<T extends unknown[]>(arr: T, name: string): T {
    const recorder = this.recorder
    return new Proxy(arr, {
      set(target, prop, value) {
        const idx = Number(prop)
        if (!isNaN(idx)) {
          const old = target[idx]
          const result = Reflect.set(target, prop, value)
          recorder.variableMutated(`${name}[${idx}]`, old, value)
          return result
        }
        return Reflect.set(target, prop, value)
      },
      get(target, prop) {
        const val = Reflect.get(target, prop)
        if (prop === 'push') {
          return (...args: unknown[]) => {
            const result = target.push(...args)
            args.forEach((arg, i) => {
              recorder.variableMutated(`${name}[${target.length - args.length + i}]`, undefined, arg)
            })
            return result
          }
        }
        if (prop === 'pop') {
          return () => {
            const old = target[target.length - 1]
            const result = target.pop()
            recorder.variableMutated(`${name}[${target.length}]`, old, undefined)
            return result
          }
        }
        if (prop === 'splice') {
          return (start: number, deleteCount: number, ...items: unknown[]) => {
            const removed = target.splice(start, deleteCount, ...items)
            removed.forEach((_, i) => {
              recorder.variableMutated(`${name}[${start + i}]`, removed[i], items[i])
            })
            return removed
          }
        }
        return val
      },
    })
  }
}
