import type { TraceRecorder } from '../TraceRecorder'

type OriginalFn<T = unknown> = T extends (...args: infer A) => infer R ? (...args: A) => R : never

export class RuntimeHooks {
  private recorder: TraceRecorder
  private originals: Map<string, unknown> = new Map()
  private installed: boolean = false

  constructor(recorder: TraceRecorder) {
    this.recorder = recorder
  }

  install(): void {
    if (this.installed) return
    this.installed = true

    this._hookSetTimeout()
    this._hookSetInterval()
    this._hookPromise()
    this._hookArrayMethods()
  }

  uninstall(): void {
    if (!this.installed) return
    this.installed = false

    for (const [key, original] of this.originals) {
      switch (key) {
        case 'setTimeout':
          global.setTimeout = original as typeof global.setTimeout
          break
        case 'setInterval':
          global.setInterval = original as typeof global.setInterval
          break
        case 'Promise':
          global.Promise = original as PromiseConstructor
          break
        default:
          break
      }
    }
    this._restoreArrayMethods()
    this.originals.clear()
  }

  private _hookSetTimeout(): void {
    const orig = global.setTimeout
    this.originals.set('setTimeout', orig)
    const recorder = this.recorder

    global.setTimeout = ((fn: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) => {
      recorder.functionCall('setTimeout', [ms])
      return orig(() => {
        recorder.functionCall('timeout-callback', args)
        fn(...args)
        recorder.functionReturn(undefined)
      }, ms)
    }) as typeof global.setTimeout
  }

  private _hookSetInterval(): void {
    const orig = global.setInterval
    this.originals.set('setInterval', orig)
    const recorder = this.recorder

    global.setInterval = ((fn: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) => {
      recorder.functionCall('setInterval', [ms])
      return orig(fn, ms, ...args)
    }) as typeof global.setInterval
  }

  private _hookPromise(): void {
    const origPromise = global.Promise
    this.originals.set('Promise', origPromise)
    const recorder = this.recorder

    class TracedPromise<T> extends origPromise<T> {
      constructor(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void) {
        recorder.functionCall('Promise-constructor', [])
        super((resolve, reject) => {
          executor(
            (value) => {
              recorder.functionCall('Promise-resolve', [value])
              resolve(value)
              recorder.functionReturn(undefined)
            },
            (reason) => {
              recorder.functionCall('Promise-reject', [reason])
              reject(reason)
              recorder.functionReturn(undefined)
            },
          )
        })
      }
    }

    global.Promise = TracedPromise as PromiseConstructor
  }

  private _hookArrayMethods(): void {
    const recorder = this.recorder
    const patchedMethods = ['sort', 'map', 'filter', 'reduce', 'forEach', 'reverse'] as const

    for (const method of patchedMethods) {
      const orig = (Array.prototype as any)[method]
      if (!orig) continue
      const key = `Array.${method}`
      this.originals.set(key, orig)

      ;(Array.prototype as any)[method] = function (this: unknown[], ...args: unknown[]) {
        recorder.functionCall(key, [this.length])
        const result = orig.apply(this, args)
        recorder.functionReturn(result)
        return result
      }
    }
  }

  private _restoreArrayMethods(): void {
    const patchedMethods = ['sort', 'map', 'filter', 'reduce', 'forEach', 'reverse'] as const
    for (const method of patchedMethods) {
      const key = `Array.${method}`
      const orig = this.originals.get(key)
      if (orig) {
        ;(Array.prototype as any)[method] = orig
      }
    }
  }
}
