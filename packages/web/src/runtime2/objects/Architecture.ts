import { R2Object } from '../core/R2Object'
import { Int, Str } from './Primitives'

export function JVMArch(): R2Object {
  const jvm = new R2Object('jvm', 'architecture', { color: '#ef4444', w: 500, h: 400 }).label('JVM').pos(50, 50)

  const classLoader = new R2Object('subsystem', 'architecture', { color: '#f87171', w: 140, h: 50 }).pos(180, 10).label('ClassLoader')
  const runtimeData = new R2Object('subsystem', 'architecture', { color: '#fca5a5', w: 300, h: 180 }).pos(100, 80).label('Runtime Data Areas')
  const execEngine = new R2Object('subsystem', 'architecture', { color: '#fecaca', w: 140, h: 50 }).pos(180, 300).label('Execution Engine')

  const methodArea = new R2Object('memory-region', 'architecture', { color: '#fb923c', w: 120, h: 50 }).pos(30, 10).label('Method Area')
  const heap = new R2Object('memory-region', 'architecture', { color: '#f97316', w: 120, h: 50 }).pos(160, 10).label('Heap')
  const stack = new R2Object('memory-region', 'architecture', { color: '#fdba74', w: 120, h: 50 }).pos(160, 70).label('Java Stacks')
  const pcReg = new R2Object('memory-region', 'architecture', { color: '#fed7aa', w: 80, h: 40 }).pos(30, 70).label('PC Registers')
  const nativeStack = new R2Object('memory-region', 'architecture', { color: '#ffedd5', w: 120, h: 40 }).pos(30, 130).label('Native Stacks')

  runtimeData.addChild(methodArea).addChild(heap).addChild(stack).addChild(pcReg).addChild(nativeStack)
  jvm.addChild(classLoader).addChild(runtimeData).addChild(execEngine)

  const stackFrame = new R2Object('stack-frame', 'architecture', { color: '#a78bfa', w: 200, h: 120 }).pos(400, 60).label('Stack Frame')
  const localVars = new R2Object('frame-section', 'architecture', { color: '#c4b5fd', w: 170, h: 30 }).pos(15, 10).label('Local Variables')
  const operandStack = new R2Object('frame-section', 'architecture', { color: '#ddd6fe', w: 170, h: 30 }).pos(15, 45).label('Operand Stack')
  const frameData = new R2Object('frame-section', 'architecture', { color: '#ede9fe', w: 170, h: 25 }).pos(15, 80).label('Frame Data')
  stackFrame.addChild(localVars).addChild(operandStack).addChild(frameData)

  const registerFile = new R2Object('register-file', 'architecture', { color: '#fbbf24', w: 180, h: 80 }).pos(400, 200).label('Registers')
  const r1 = Int(0, 'R1').pos(10, 10).size(36, 24)
  const r2 = Int(0, 'R2').pos(52, 10).size(36, 24)
  const r3 = Int(0, 'R3').pos(94, 10).size(36, 24)
  const pc = Int(0, 'PC').pos(10, 40).size(36, 24)
  const sp = Int(0, 'SP').pos(52, 40).size(36, 24)
  registerFile.addChild(r1).addChild(r2).addChild(r3).addChild(pc).addChild(sp)

  jvm.addChild(stackFrame).addChild(registerFile)
  return jvm
}

export function CPUArch(): R2Object {
  const cpu = new R2Object('cpu', 'architecture', { color: '#6366f1', w: 400, h: 300 }).label('CPU').pos(50, 50)
  const alu = new R2Object('alu', 'architecture', { color: '#818cf8', w: 100, h: 80 }).pos(50, 20).label('ALU')
  const control = new R2Object('control-unit', 'architecture', { color: '#a5b4fc', w: 100, h: 60 }).pos(200, 20).label('Control Unit')
  const registers = new R2Object('register-bank', 'architecture', { color: '#c7d2fe', w: 300, h: 80 }).pos(50, 130).label('Registers')
  const cache = new R2Object('cache', 'architecture', { color: '#e0e7ff', w: 300, h: 50 }).pos(50, 230).label('L1 Cache')

  for (let i = 0; i < 8; i++) {
    const reg = Int(0, `R${i}`).pos(i * 37, 5).size(32, 28)
    registers.addChild(reg)
  }
  cpu.addChild(alu).addChild(control).addChild(registers).addChild(cache)
  return cpu
}

export function MemoryArch(): R2Object {
  const mem = new R2Object('memory', 'architecture', { color: '#14b8a6', w: 350, h: 320 }).label('Memory').pos(50, 50)
  const stackRegion = new R2Object('mem-region', 'architecture', { color: '#2dd4bf', w: 300, h: 60 }).pos(25, 10).label('Stack')
  const heapRegion = new R2Object('mem-region', 'architecture', { color: '#5eead4', w: 300, h: 80 }).pos(25, 80).label('Heap')
  const codeRegion = new R2Object('mem-region', 'architecture', { color: '#99f6e4', w: 300, h: 50 }).pos(25, 180).label('Code Segment')
  const dataRegion = new R2Object('mem-region', 'architecture', { color: '#ccfbf1', w: 300, h: 40 }).pos(25, 240).label('Data Segment')

  for (let i = 0; i < 4; i++) {
    const frame = new R2Object('stack-frame', 'architecture', { color: '#5eead4', w: 260, h: 10 }).pos(20, 10 + i * 12).label(`frame_${i}`)
    stackRegion.addChild(frame)
  }
  for (let i = 0; i < 6; i++) {
    const block = new R2Object('heap-block', 'architecture', { color: '#2dd4bf', w: 40, h: 16 }).pos(i * 48, 10).label(`0x${(i * 16).toString(16)}`)
    heapRegion.addChild(block)
  }
  mem.addChild(stackRegion).addChild(heapRegion).addChild(codeRegion).addChild(dataRegion)
  return mem
}

export function ThreadObj(id: string, state: string = 'running'): R2Object {
  const t = new R2Object('thread', 'architecture', { color: '#ec4899', w: 140, h: 80 }).label(`Thread-${id}`)
  t.set('threadId', id).set('state', state)
  const pc = Int(0, 'PC').pos(10, 10).size(36, 24)
  const stack = new R2Object('thread-stack', 'architecture', { color: '#f472b6', w: 50, h: 30 }).pos(60, 10).label('stack')
  t.addChild(pc).addChild(stack)
  return t
}
