import * as acorn from 'acorn';

// Extract identifier names from destructuring patterns
function patternNames(pat) {
  if (!pat) return [];
  if (pat.type === 'Identifier') return [pat.name];
  if (pat.type === 'ArrayPattern') return pat.elements.flatMap(e => e ? patternNames(e) : []);
  if (pat.type === 'ObjectPattern') return pat.properties.flatMap(p => patternNames(p.value || p.key));
  if (pat.type === 'AssignmentPattern') return patternNames(pat.left);
  if (pat.type === 'RestElement') return patternNames(pat.argument);
  return [];
}

// Variable names from a for-loop init / for-of left
function loopVarNames(initNode) {
  if (!initNode) return [];
  if (initNode.type === 'VariableDeclaration') return initNode.declarations.flatMap(d => patternNames(d.id));
  if (initNode.type === 'Identifier') return [initNode.name];
  return [];
}

// Name of the left side of an assignment (obj.prop → obj name, arr[i] → arr name)
function assignTargetName(left) {
  if (left.type === 'Identifier') return left.name;
  if (left.type === 'MemberExpression' && left.object.type === 'Identifier') return left.object.name;
  return null;
}

// Safe capture snippet: try{__s.NAME=NAME;}catch(_){}
function cap(name) {
  return `try{__s.${name}=${name};}catch(_){}`;
}

function stepCall(line) {
  return `__step__({...__s},${line});`;
}

// Walk statement tree and push injection objects: { pos, text }
function walkStmt(stmt, src, inj) {
  if (!stmt) return;
  const line = stmt.loc?.start?.line ?? 1;

  switch (stmt.type) {
    case 'VariableDeclaration': {
      const names = stmt.declarations.flatMap(d => patternNames(d.id));
      const caps = names.map(cap).join('');
      inj.push({ pos: stmt.end, text: `\n${caps}${stepCall(line)}` });
      break;
    }

    case 'ExpressionStatement': {
      const expr = stmt.expression;
      if (expr.type === 'AssignmentExpression') {
        const n = assignTargetName(expr.left);
        inj.push({ pos: stmt.end, text: `\n${n ? cap(n) : ''}${stepCall(line)}` });
      } else if (expr.type === 'UpdateExpression' && expr.argument.type === 'Identifier') {
        inj.push({ pos: stmt.end, text: `\n${cap(expr.argument.name)}${stepCall(line)}` });
      } else if (
        expr.type === 'CallExpression' &&
        expr.callee.type === 'MemberExpression' &&
        expr.callee.object.type === 'Identifier'
      ) {
        // arr.push(), arr.pop(), map.set(), etc. — re-capture the object
        const n = expr.callee.object.name;
        inj.push({ pos: stmt.end, text: `\n${cap(n)}${stepCall(line)}` });
      }
      break;
    }

    case 'ReturnStatement': {
      if (stmt.argument) {
        // Wrap: return EXPR → return (__s.__result=(EXPR),__step__(...),__s.__result)
        // Note: NO semicolon inside the comma-operator expression
        inj.push({ pos: stmt.argument.start, text: '(__s.__result=(' });
        inj.push({ pos: stmt.argument.end, text: `),__step__({...__s},${line}),__s.__result)` });
      } else {
        inj.push({ pos: stmt.start, text: `__s.__result=undefined;${stepCall(line)}` });
      }
      break;
    }

    case 'ForStatement': {
      const lvNames = loopVarNames(stmt.init);
      const caps = lvNames.map(cap).join('');
      if (stmt.body.type === 'BlockStatement') {
        inj.push({ pos: stmt.body.start + 1, text: `\n${caps}${stepCall(line)}` });
        stmt.body.body.forEach(s => walkStmt(s, src, inj));
      }
      break;
    }

    case 'WhileStatement':
    case 'DoWhileStatement': {
      const body = stmt.body;
      if (body.type === 'BlockStatement') {
        inj.push({ pos: body.start + 1, text: `\n${stepCall(line)}` });
        body.body.forEach(s => walkStmt(s, src, inj));
      }
      break;
    }

    case 'ForOfStatement':
    case 'ForInStatement': {
      const lvNames = loopVarNames(stmt.left);
      const caps = lvNames.map(cap).join('');
      if (stmt.body.type === 'BlockStatement') {
        inj.push({ pos: stmt.body.start + 1, text: `\n${caps}${stepCall(line)}` });
        stmt.body.body.forEach(s => walkStmt(s, src, inj));
      }
      break;
    }

    case 'IfStatement': {
      if (stmt.consequent?.type === 'BlockStatement') stmt.consequent.body.forEach(s => walkStmt(s, src, inj));
      else if (stmt.consequent) walkStmt(stmt.consequent, src, inj);
      if (stmt.alternate?.type === 'BlockStatement') stmt.alternate.body.forEach(s => walkStmt(s, src, inj));
      else if (stmt.alternate) walkStmt(stmt.alternate, src, inj);
      break;
    }

    case 'BlockStatement': {
      stmt.body.forEach(s => walkStmt(s, src, inj));
      break;
    }

    case 'SwitchStatement': {
      for (const c of stmt.cases) c.consequent.forEach(s => walkStmt(s, src, inj));
      break;
    }

    case 'TryStatement': {
      if (stmt.block) stmt.block.body.forEach(s => walkStmt(s, src, inj));
      if (stmt.handler) stmt.handler.body.body.forEach(s => walkStmt(s, src, inj));
      break;
    }
  }
}

/**
 * Parse and instrument a JavaScript function.
 * Returns { code, fnName, paramNames, codeLines }
 */
export function instrumentFunction(sourceCode) {
  let ast;
  try {
    ast = acorn.parse(sourceCode, { ecmaVersion: 2022, sourceType: 'script', locations: true });
  } catch (e) {
    throw new Error(`Syntax error: ${e.message}`, { cause: e });
  }

  let fnNode = null;
  let fnName = '__fn';

  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration') {
      fnNode = node;
      fnName = node.id?.name || '__fn';
      break;
    }
    if (node.type === 'VariableDeclaration') {
      const d = node.declarations[0];
      const init = d?.init;
      if (init?.type === 'FunctionExpression' || init?.type === 'ArrowFunctionExpression') {
        fnNode = init;
        fnName = d.id?.name || '__fn';
        break;
      }
    }
  }

  if (!fnNode) {
    throw new Error('No function found.\nWrite a named function:\n  function solve(arr) { ... }');
  }
  if (!fnNode.body || fnNode.body.type !== 'BlockStatement') {
    throw new Error('Use a block body: (x) => { ... } not (x) => expr');
  }

  const paramNames = fnNode.params.flatMap(p => patternNames(p));

  const inj = [];
  // Initialize __s with params at function body start
  const initCode = `\nconst __s={${paramNames.map(n => `${n}:${n}`).join(',')}};`;
  inj.push({ pos: fnNode.body.start + 1, text: initCode });

  // Walk function body
  fnNode.body.body.forEach(s => walkStmt(s, sourceCode, inj));

  // Apply injections in reverse position order (so positions stay valid)
  inj.sort((a, b) => b.pos - a.pos);
  let code = sourceCode;
  for (const { pos, text } of inj) {
    code = code.slice(0, pos) + text + code.slice(pos);
  }

  return { code, fnName, paramNames, codeLines: sourceCode.split('\n') };
}
