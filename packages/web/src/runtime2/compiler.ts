import { R2Object } from './core/R2Object'
import { Universe } from './core/Universe'
import { Int, Str, ArrayObj, MatrixObj, LinkedListObj, StackObj, QueueObj, TreeObj, GraphObj } from './objects'

/* ─── Token Objects ─── */
export enum TokenType {
  Keyword, Identifier, Number, String, Operator, Bracket, Punctuation, Comment, Whitespace, EOF
}
export class Token extends R2Object {
  constructor(public tokenType: TokenType, public lexeme: string, pos: number) {
    super('token', 'compiler', { color: '#f59e0b', w: Math.max(24, lexeme.length * 8 + 8), h: 22 })
    this.set('tokenType', TokenType[tokenType]).set('lexeme', lexeme).set('pos', pos)
    this.label(lexeme)
  }
}

/* ─── AST Node Objects ─── */
export enum ASTNodeType {
  Program, FunctionDecl, VariableDecl, Assignment, IfStatement, ForLoop, WhileLoop, ReturnStatement,
  BinaryOp, UnaryOp, CallExpression, Identifier, Literal, ArrayLiteral, Block, Parameter
}
export class ASTNode extends R2Object {
  astChildren: ASTNode[] = []
  constructor(public astType: ASTNodeType, public value: string, children: ASTNode[] = []) {
    super('ast-node', 'compiler', { color: '#8b5cf6', w: 90, h: 28 })
    this.set('astType', ASTNodeType[astType]).set('value', value)
    this.astChildren = children
    this.label(`${ASTNodeType[astType]}:${value}`)
  }
  addASTChild(c: ASTNode): void { this.astChildren.push(c) }
}

/* ─── IR Instruction Objects ─── */
export class IRInst extends R2Object {
  constructor(public op: string, public args: string[], public result?: string) {
    super('ir-instruction', 'compiler', { color: '#06b6d4', w: 130, h: 24 })
    this.set('op', op).set('args', args).set('result', result)
    this.label(`${result ? result + ' = ' : ''}${op} ${args.join(', ')}`)
  }
}

/* ─── Variable Trace Objects ─── */
export class VariableObj extends R2Object {
  constructor(name: string, val: unknown, scope: string, isTemp: boolean = false) {
    super('variable', 'compiler', { color: isTemp ? '#f97316' : '#3b82f6', w: 100, h: 28 })
    this.set('name', name).set('value', val).set('scope', scope).set('isTemp', isTemp)
    this.label(`${name} = ${formatVal(val)}`)
  }
  update(val: unknown): void {
    this.set('value', val)
    this.label(`${this.get('name')} = ${formatVal(val)}`)
  }
}

function formatVal(v: unknown): string {
  if (v === null) return 'null'
  if (v === undefined) return 'undefined'
  if (typeof v === 'string') return `"${v}"`
  if (Array.isArray(v)) return `[${v.join(',')}]`
  return String(v)
}

/* ─── Pipeline layout constants ─── */
const L = {
  TOKENS_Y: 0,
  AST_Y: 60,
  IR_Y: 160,
  VARS_Y: 280,
  ALGO_Y: 420,
}

/* ─── Full Compiler Pipeline ─── */
export class CompilerPipeline {
  universe: Universe = new Universe()
  tokens: Token[] = []
  ast: ASTNode | null = null
  ir: IRInst[] = []
  variables: Map<string, VariableObj> = new Map()
  tempVars: Map<string, VariableObj> = new Map()
  variablesByScope: Map<string, VariableObj[]> = new Map()
  steps: { label: string; vars: Record<string, unknown>; tempVars: Record<string, unknown> }[] = []
  stepIndex = 0
  executionResult: string = ''

  /* ─── Tokenize ─── */
  tokenize(code: string): Token[] {
    this.universe.clear()
    this.tokens = []
    const tokenSpec: [RegExp, TokenType][] = [
      [/\/\/.*/, TokenType.Comment], [/\/\*[\s\S]*?\*\//, TokenType.Comment],
      [/\b(let|const|var|function|return|if|else|for|while|do|break|continue|new|class|this|true|false|null|undefined|switch|case|default|try|catch|finally|throw|import|export|from|async|await|of|in)\b/, TokenType.Keyword],
      [/\b\d+\.?\d*\b/, TokenType.Number],
      [/"([^"\\]|\\.)*"/, TokenType.String], [/'([^'\\]|\\.)*'/, TokenType.String],
      [/[a-zA-Z_$][\w$]*/, TokenType.Identifier],
      [/[+\-*/%=<>!&|^~?:]+/, TokenType.Operator],
      [/[{}()\[\]]/, TokenType.Bracket],
      [/[;,.]/, TokenType.Punctuation],
      [/\s+/, TokenType.Whitespace],
    ]
    let pos = 0; let tx = 4
    while (pos < code.length) {
      let matched = false
      for (const [regex, type] of tokenSpec) {
        const m = code.slice(pos).match(regex)
        if (m && m.index === 0) {
          if (type !== TokenType.Whitespace && type !== TokenType.Comment) {
            const tok = new Token(type, m[0], pos)
            tok.pos(tx, L.TOKENS_Y)
            tx += tok.state.w + 4
            this.tokens.push(tok)
            this.universe.add(tok)
          }
          pos += m[0].length
          matched = true; break
        }
      }
      if (!matched) pos++
    }
    const eof = new Token(TokenType.EOF, 'EOF', pos)
    eof.pos(tx, L.TOKENS_Y)
    this.tokens.push(eof); this.universe.add(eof)
    this.connectTokens()
    this.universe.snapshot('tokenized')
    this.steps.push({ label: 'tokenized', vars: {}, tempVars: {} })
    return this.tokens
  }

  private connectTokens(): void {
    for (let i = 0; i < this.tokens.length - 1; i++) {
      const c = this.universe.connect(this.tokens[i], this.tokens[i + 1])
      c.style = 'solid'; c.color = '#475569'; c.width = 1
    }
  }

  /* ─── Parse ─── */
  private tokenPos = 0
  parse(): ASTNode {
    this.tokenPos = 0
    const program = this.parseProgram()
    this.ast = program
    // Flatten AST into universe: each node is a top-level object, 
    // connected by edges (not parent-child in rendering tree).
    const flatNodes: ASTNode[] = []
    const collect = (n: ASTNode) => { flatNodes.push(n); n.astChildren.forEach(c => collect(c)) }
    collect(program)
    const perRow = 6
    flatNodes.forEach((n, i) => {
      n.pos(10 + (i % perRow) * 100, L.AST_Y + Math.floor(i / perRow) * 36)
      this.universe.add(n)
    })
    // Connect parent→child via universe edges
    const connectParentChild = (n: ASTNode) => {
      n.astChildren.forEach(c => {
        this.universe.connect(n, c).color_('#8b5cf6').curve(0.12)
        connectParentChild(c)
      })
    }
    connectParentChild(program)
    this.universe.snapshot('parsed')
    this.steps.push({ label: 'parsed', vars: {}, tempVars: {} })
    return program
  }

  private peek(): Token { return this.tokens[this.tokenPos] }
  private consume(): Token { return this.tokens[this.tokenPos++] }
  private expect(type: TokenType, val?: string): Token {
    const t = this.peek()
    if (t.tokenType !== type || (val && t.lexeme !== val)) throw new Error(`Expected ${TokenType[type]} ${val || ''} got ${t.lexeme}`)
    return this.consume()
  }

  private parseProgram(): ASTNode {
    const prog = new ASTNode(ASTNodeType.Program, 'program')
    while (this.peek().tokenType !== TokenType.EOF) {
      const stmt = this.parseStatement()
      if (stmt) prog.addASTChild(stmt)
    }
    return prog
  }

  private parseStatement(): ASTNode | null {
    const t = this.peek()
    if (t.tokenType === TokenType.Keyword) {
      if (['let', 'const', 'var'].includes(t.lexeme)) return this.parseVarDecl()
      if (t.lexeme === 'function') return this.parseFunction()
      if (t.lexeme === 'if') return this.parseIf()
      if (t.lexeme === 'for') return this.parseFor()
      if (t.lexeme === 'while') return this.parseWhile()
      if (t.lexeme === 'return') { this.consume(); return new ASTNode(ASTNodeType.ReturnStatement, 'return') }
    }
    if (t.tokenType === TokenType.Identifier && this.tokens[this.tokenPos + 1]?.lexeme === '=') return this.parseAssignment()
    if (t.lexeme === '{') return this.parseBlock()
    this.consume()
    return null
  }

  private parseVarDecl(): ASTNode {
    this.consume()
    const name = this.expect(TokenType.Identifier).lexeme
    const node = new ASTNode(ASTNodeType.VariableDecl, name)
    if (this.peek().lexeme === '=') { this.consume(); node.addASTChild(this.parseExpression()) }
    return node
  }

  private parseFunction(): ASTNode {
    this.consume()
    const name = this.expect(TokenType.Identifier).lexeme
    const fn = new ASTNode(ASTNodeType.FunctionDecl, name)
    this.expect(TokenType.Bracket, '(')
    while (this.peek().lexeme !== ')') {
      if (this.peek().tokenType === TokenType.Identifier) fn.addASTChild(new ASTNode(ASTNodeType.Parameter, this.consume().lexeme))
      else this.consume()
    }
    this.consume(); fn.addASTChild(this.parseBlock()); return fn
  }

  private parseIf(): ASTNode {
    const node = new ASTNode(ASTNodeType.IfStatement, 'if')
    this.consume(); this.expect(TokenType.Bracket, '('); node.addASTChild(this.parseExpression())
    this.expect(TokenType.Bracket, ')'); node.addASTChild(this.parseBlock())
    if (this.peek().lexeme === 'else') { this.consume(); node.addASTChild(this.parseBlock()) }
    return node
  }

  private parseFor(): ASTNode {
    const node = new ASTNode(ASTNodeType.ForLoop, 'for')
    this.consume(); this.expect(TokenType.Bracket, '(')
    node.addASTChild(this.parseVarDecl() || new ASTNode(ASTNodeType.VariableDecl, ''))
    node.addASTChild(this.parseExpression()); this.expect(TokenType.Punctuation, ';')
    node.addASTChild(this.parseExpression()); this.expect(TokenType.Bracket, ')')
    node.addASTChild(this.parseBlock()); return node
  }

  private parseWhile(): ASTNode {
    const node = new ASTNode(ASTNodeType.WhileLoop, 'while')
    this.consume(); this.expect(TokenType.Bracket, '(')
    node.addASTChild(this.parseExpression()); this.expect(TokenType.Bracket, ')')
    node.addASTChild(this.parseBlock()); return node
  }

  private parseBlock(): ASTNode {
    const block = new ASTNode(ASTNodeType.Block, 'block')
    this.expect(TokenType.Bracket, '{')
    while (this.peek().lexeme !== '}') { const s = this.parseStatement(); if (s) block.addASTChild(s) }
    this.consume(); return block
  }

  private parseAssignment(): ASTNode {
    const name = this.expect(TokenType.Identifier).lexeme
    this.expect(TokenType.Operator, '=')
    const node = new ASTNode(ASTNodeType.Assignment, name)
    node.addASTChild(this.parseExpression()); return node
  }

  private parseExpression(): ASTNode {
    let left = this.parsePrimary()
    while (['+', '-', '*', '/', '%', '>', '<', '>=', '<=', '==', '!=', '&&', '||'].includes(this.peek().lexeme)) {
      const op = this.consume().lexeme
      const bin = new ASTNode(ASTNodeType.BinaryOp, op)
      bin.addASTChild(left); bin.addASTChild(this.parsePrimary()); left = bin
    }
    return left
  }

  private parsePrimary(): ASTNode {
    const t = this.peek()
    if (t.tokenType === TokenType.Number) { this.consume(); return new ASTNode(ASTNodeType.Literal, t.lexeme) }
    if (t.tokenType === TokenType.String) { this.consume(); return new ASTNode(ASTNodeType.Literal, t.lexeme.slice(1, -1)) }
    if (t.tokenType === TokenType.Identifier) {
      this.consume()
      if (this.peek().lexeme === '(') {
        this.consume(); const call = new ASTNode(ASTNodeType.CallExpression, t.lexeme)
        while (this.peek().lexeme !== ')') { call.addASTChild(this.parseExpression()); if (this.peek().lexeme === ',') this.consume() }
        this.consume(); return call
      }
      return new ASTNode(ASTNodeType.Identifier, t.lexeme)
    }
    if (t.lexeme === '(') { this.consume(); const e = this.parseExpression(); this.expect(TokenType.Bracket, ')'); return e }
    if (t.lexeme === '[') {
      this.consume(); const arr = new ASTNode(ASTNodeType.ArrayLiteral, '[]')
      while (this.peek().lexeme !== ']') { arr.addASTChild(this.parseExpression()); if (this.peek().lexeme === ',') this.consume() }
      this.consume(); return arr
    }
    if (['true', 'false'].includes(t.lexeme)) { this.consume(); return new ASTNode(ASTNodeType.Literal, t.lexeme) }
    if (t.lexeme === '-') { this.consume(); return new ASTNode(ASTNodeType.UnaryOp, '-') }
    this.consume(); return new ASTNode(ASTNodeType.Literal, 'undefined')
  }

  /* ─── IR Generation ─── */
  generateIR(): IRInst[] {
    this.ir = []
    if (!this.ast) return this.ir
    let tempCounter = 0; let iy = L.IR_Y
    const emit = (op: string, args: string[], result?: string) => {
      const inst = new IRInst(op, args, result)
      inst.pos(20, iy); iy += 28
      this.ir.push(inst); this.universe.add(inst)
      if (this.ir.length > 1) {
        const c = this.universe.connect(this.ir[this.ir.length - 2], inst)
        c.color = '#0891b2'; c.style = 'curve'
      }
      return result
    }
    const genIRNode = (node: ASTNode): string => {
      switch (node.astType) {
        case ASTNodeType.Literal: return node.value
        case ASTNodeType.Identifier: return node.value
        case ASTNodeType.BinaryOp: {
          const left = genIRNode(node.astChildren[0]); const right = genIRNode(node.astChildren[1])
          const temp = `t${++tempCounter}`; emit(node.value, [left, right], temp)
          const tv = new VariableObj(temp, '', 'ir', true); this.universe.add(tv); this.tempVars.set(temp, tv); return temp
        }
        case ASTNodeType.VariableDecl: { if (node.astChildren.length > 0) { const val = genIRNode(node.astChildren[0]); emit('mov', [val], node.value) } return node.value }
        case ASTNodeType.Assignment: { const val = genIRNode(node.astChildren[0]); emit('mov', [val], node.value); return node.value }
        case ASTNodeType.ForLoop: {
          if (node.astChildren[0]?.astChildren?.length > 0) genIRNode(node.astChildren[0])
          const cond = genIRNode(node.astChildren[1]); emit('jz', [cond, 'end_for'], '')
          genIRNode(node.astChildren[3]); genIRNode(node.astChildren[2]); emit('jmp', ['for_start'], ''); emit('label', ['end_for'], ''); return ''
        }
        case ASTNodeType.CallExpression: emit('call', [node.value, ...node.astChildren.map(c => genIRNode(c))], ''); return ''
        case ASTNodeType.Block: node.astChildren.forEach(c => genIRNode(c)); return ''
        case ASTNodeType.Program: node.astChildren.forEach(c => genIRNode(c)); return ''
        case ASTNodeType.ReturnStatement: emit('ret', [], ''); return ''
        default: return ''
      }
    }
    genIRNode(this.ast)
    this.universe.snapshot('ir-generated')
    this.steps.push({ label: 'ir-generated', vars: {}, tempVars: {} })
    return this.ir
  }

  /* ─── Execute DSA Code ─── */
  executeDSA(code: string, inputs?: Record<string, number[]>): { universe: Universe; steps: typeof this.steps; variables: Map<string, VariableObj> } {
    this.tokenize(code)
    this.parse()
    this.generateIR()
    this.variables.clear()
    this.tempVars.clear()
    this.variablesByScope.clear()
    this.steps = []
    let stepCounter = 0

    const trackStep = (label: string, vars: Record<string, unknown>, temps: Record<string, unknown>) => {
      this.steps.push({ label, vars: { ...vars }, tempVars: { ...temps } })
      stepCounter++
    }

    const trackVar = (name: string, val: unknown, scope: string, isTemp = false): VariableObj => {
      const map = isTemp ? this.tempVars : this.variables
      const existing = map.get(name)
      if (existing) { existing.update(val); return existing }
      const v = new VariableObj(name, val, scope, isTemp)
      const idx = map.size
      const perRow = 8
      v.pos(10 + (idx % perRow) * 110, L.VARS_Y + Math.floor(idx / perRow) * 34)
      map.set(name, v)
      this.universe.add(v)
      const existingInScope = this.variablesByScope.get(scope) || []
      existingInScope.push(v)
      this.variablesByScope.set(scope, existingInScope)
      return v
    }

    // Add stage labels
    const stageLabel = (text: string, y: number) => {
      const lbl = new R2Object('stage-label', 'visual', { color: '#64748b', w: text.length * 7, h: 14 })
      lbl.label(text).pos(2, y - 14).set('text', text)
      this.universe.add(lbl)
    }
    stageLabel('TOKENS', L.TOKENS_Y)
    stageLabel('AST', L.AST_Y)
    stageLabel('IR', L.IR_Y)
    stageLabel('VARS', L.VARS_Y)

    const match = (pattern: RegExp): boolean => pattern.test(code)

    /* ── Two Sum ── */
    if (match(/twoSum|two.?sum/i)) {
      const nums = inputs?.nums || [2, 7, 11, 15]
      const target = inputs?.target?.[0] ?? 9
      trackVar('nums', nums, 'global'); trackVar('target', target, 'global')
      trackStep('init', { nums, target }, {})
      const map = new Map<number, number>()
      trackVar('map', 'Map{}', 'global')
      const mapObj = new R2Object('debug-map', 'compiler', { color: '#a78bfa', w: 200, h: 80 }).label('seen map').pos(650, L.VARS_Y)
      this.universe.add(mapObj)
      const numsObj = ArrayObj(nums, 'nums').pos(50, L.ALGO_Y)
      this.universe.add(numsObj)

      for (let i = 0; i < nums.length; i++) {
        trackVar('i', i, 'for-loop', true)
        const num = nums[i]; trackVar('num', num, 'for-loop', true)
        const complement = target - num; trackVar('complement', complement, 'for-loop', true)
        trackStep(`step_${i}`, { i, num, complement }, {})

        if (map.has(complement)) {
          const idx = map.get(complement)!
          trackVar('result', [idx, i], 'global')
          this.executionResult = JSON.stringify([idx, i])
          trackStep('found', { result: [idx, i] }, {})
          this.universe.snapshot('execution-complete')
          return { universe: this.universe, steps: this.steps, variables: this.variables }
        }
        map.set(num, i)
        const entry = new R2Object('map-entry', 'compiler', { color: '#a78bfa', w: 56, h: 24 })
          .label(`${num}→${i}`).pos(map.size * 60, 0)
        mapObj.addChild(entry)
        trackStep(`map_${i}`, { map: Object.fromEntries(map) }, {})
      }
      this.executionResult = JSON.stringify([])
    }

    /* ── Bubble Sort ── */
    else if (match(/sort|bubble/i)) {
      const arr = [...(inputs?.arr || [64, 34, 25, 12, 22, 11, 90])]
      trackVar('arr', arr, 'global')
      const arrObj = ArrayObj(arr, 'arr').pos(50, L.ALGO_Y)
      this.universe.add(arrObj)

      for (let i = 0; i < arr.length; i++) {
        trackVar('i', i, 'outer-loop', true)
        for (let j = 0; j < arr.length - i - 1; j++) {
          trackVar('j', j, 'inner-loop', true)
          const cmp = arr[j] > arr[j + 1]
          trackStep(`cmp_${i}_${j}`, { i, j, a: arr[j], b: arr[j + 1], swap: cmp }, {})
          if (cmp) {
            const tmp = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = tmp
            trackVar('tmp', tmp, 'inner-loop', true)
            trackVar('arr', arr, 'global')
            trackStep(`swap_${i}_${j}`, { arr }, { tmp })
          }
        }
        trackStep(`pass_${i}`, { arr }, {})
      }
      this.executionResult = JSON.stringify(arr)
    }

    /* ── Binary Search ── */
    else if (match(/binary.?search|binSearch/i)) {
      const arr = inputs?.arr || [1, 3, 5, 7, 9, 11, 13, 15]
      const target = inputs?.target?.[0] ?? 7
      trackVar('arr', arr, 'global'); trackVar('target', target, 'global')
      let lo = 0; let hi = arr.length - 1
      trackVar('lo', lo, 'global'); trackVar('hi', hi, 'global')
      const arrObj = ArrayObj(arr, 'arr').pos(50, L.ALGO_Y)
      this.universe.add(arrObj)

      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2)
        trackVar('mid', mid, 'loop', true); trackVar('arr[mid]', arr[mid], 'loop', true)
        trackStep(`search`, { lo, hi, mid, val: arr[mid] }, {})
        // Range label
        const rangeLabel = new R2Object('range-label', 'visual', { color: '#f59e0b', w: 80, h: 18 })
          .pos(50, L.ALGO_Y + 80).label(`lo=${lo} hi=${hi} mid=${mid}`)
        this.universe.add(rangeLabel)

        if (arr[mid] === target) {
          this.executionResult = `Found at index ${mid}`; trackStep('found', { result: mid }, {}); break
        } else if (arr[mid] < target) { lo = mid + 1 }
        else { hi = mid - 1 }
      }
      if (!this.executionResult) this.executionResult = 'Not found'
    }

    /* ── BFS Graph ── */
    else if (match(/graph|dfs|bfs|adjacency/i)) {
      const adjList: Record<string, string[]> = {
        A: ['B', 'C'], B: ['A', 'D', 'E'], C: ['A', 'F'],
        D: ['B'], E: ['B', 'F'], F: ['C', 'E'],
      }
      trackVar('graph', adjList, 'global')
      const graphObj = GraphObj(
        Object.keys(adjList).map(k => ({ id: k, label: k, val: k.charCodeAt(0) })),
        Object.entries(adjList).flatMap(([k, vs]) => vs.map(v => ({ from: k, to: v }))),
        'graph', { universe: this.universe }
      ).pos(50, L.ALGO_Y)
      this.universe.add(graphObj)

      const visited = new Set<string>()
      trackVar('visited', 'Set{}', 'global')
      const queue = ['A']; trackVar('queue', queue, 'global')
      trackStep('bfs_start', { start: 'A' }, {})

      while (queue.length > 0) {
        const node = queue.shift()!
        trackVar('node', node, 'bfs-loop', true)
        trackStep(`bfs_visit_${node}`, { node, visited: [...visited], queue }, {})
        if (!visited.has(node)) {
          visited.add(node)
          const neighbors = adjList[node] || []
          trackVar('neighbors', neighbors, 'bfs-loop', true)
          neighbors.forEach(n => { if (!visited.has(n)) queue.push(n) })
        }
      }
      this.executionResult = `Visited: ${[...visited].join(', ')}`
    }

    /* ── Tree Traversal ── */
    else if (match(/tree|inorder|preorder|postorder|traversal/i)) {
      const treeVals = [1, 2, 3, 4, 5, 6, 7]
      trackVar('tree', treeVals, 'global')
      const treeObj = TreeObj(treeVals, 'binary-tree', { universe: this.universe }).pos(50, L.ALGO_Y)
      this.universe.add(treeObj)

      const result: number[] = []
      const traverse = (idx: number) => {
        if (idx >= treeVals.length || treeVals[idx] === null) return
        trackVar('idx', idx, 'recursion', true); trackVar('val', treeVals[idx], 'recursion', true)
        traverse(idx * 2 + 1); result.push(treeVals[idx])
        traverse(idx * 2 + 2)
        trackStep(`inorder_${idx}`, { node: treeVals[idx], result }, {})
      }
      traverse(0)
      this.executionResult = `Inorder: ${result.join(', ')}`
    }

    /* ── Default ── */
    else {
      const arr = inputs?.arr || [1, 2, 3, 4, 5]
      trackVar('data', arr, 'global')
      let sum = 0; trackVar('sum', sum, 'global')
      for (let i = 0; i < arr.length; i++) {
        trackVar('i', i, 'for-loop', true); const el = arr[i]
        trackVar('element', el, 'for-loop', true); sum += el
        trackVar('sum', sum, 'global'); trackStep(`sum_${i}`, { i, el, sum }, {})
      }
      this.executionResult = `Sum = ${sum}`
    }

    this.universe.snapshot('execution-complete')
    return { universe: this.universe, steps: this.steps, variables: this.variables }
  }

  run(code: string, inputs?: Record<string, number[]>): {
    universe: Universe; tokens: Token[]; ast: ASTNode | null; ir: IRInst[];
    steps: typeof this.steps; variables: Map<string, VariableObj>; result: string
  } {
    const exec = this.executeDSA(code, inputs)
    return { ...exec, tokens: this.tokens, ast: this.ast, ir: this.ir, result: this.executionResult }
  }
}

export const pipeline = new CompilerPipeline()
