/**
 * Safe expression engine for rules, metric filters, and operation bodies.
 * Supports literals, identifiers bound to a scope, arithmetic, comparison,
 * and boolean logic. No property access, calls, or host escape.
 */

export type Scope = Record<string, unknown>

type Token =
  | { type: 'num'; value: number }
  | { type: 'str'; value: string }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string }

const OPS = ['&&', '||', '==', '!=', '<=', '>=', '<', '>', '+', '-', '*', '/', '(', ')', '!']

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (ch === '"' || ch === "'") {
      const end = src.indexOf(ch, i + 1)
      if (end === -1) throw new Error(`未闭合的字符串（unterminated string）: ${src.slice(i)}`)
      tokens.push({ type: 'str', value: src.slice(i + 1, end) })
      i = end + 1
      continue
    }
    if (/[0-9]/.test(ch)) {
      const m = /^[0-9]+(\.[0-9]+)?/.exec(src.slice(i))!
      tokens.push({ type: 'num', value: Number(m[0]) })
      i += m[0].length
      continue
    }
    if (/[A-Za-z_]/.test(ch)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!
      const word = m[0]
      if (word === 'and') tokens.push({ type: 'op', value: '&&' })
      else if (word === 'or') tokens.push({ type: 'op', value: '||' })
      else if (word === 'not') tokens.push({ type: 'op', value: '!' })
      else tokens.push({ type: 'ident', value: word })
      i += word.length
      continue
    }
    const op = OPS.find((o) => src.startsWith(o, i))
    if (!op) throw new Error(`无法识别的字符（unexpected character）: ${ch}`)
    tokens.push({ type: 'op', value: op })
    i += op.length
    continue
  }
  return tokens
}

class Parser {
  private pos = 0
  constructor(private readonly tokens: Token[]) {}

  parse(): Node {
    const node = this.parseOr()
    if (this.pos < this.tokens.length) {
      throw new Error(`表达式存在多余内容（trailing tokens）`)
    }
    return node
  }

  private peekOp(...ops: string[]): string | null {
    const t = this.tokens[this.pos]
    return t && t.type === 'op' && ops.includes(t.value) ? t.value : null
  }

  private parseOr(): Node {
    let left = this.parseAnd()
    while (this.peekOp('||')) {
      this.pos++
      left = { type: 'binary', op: '||', left, right: this.parseAnd() }
    }
    return left
  }

  private parseAnd(): Node {
    let left = this.parseComparison()
    while (this.peekOp('&&')) {
      this.pos++
      left = { type: 'binary', op: '&&', left, right: this.parseComparison() }
    }
    return left
  }

  private parseComparison(): Node {
    let left = this.parseAdditive()
    const op = this.peekOp('==', '!=', '<=', '>=', '<', '>')
    if (op) {
      this.pos++
      left = { type: 'binary', op, left, right: this.parseAdditive() }
    }
    return left
  }

  private parseAdditive(): Node {
    let left = this.parseMultiplicative()
    for (;;) {
      const op = this.peekOp('+', '-')
      if (!op) return left
      this.pos++
      left = { type: 'binary', op, left, right: this.parseMultiplicative() }
    }
  }

  private parseMultiplicative(): Node {
    let left = this.parseUnary()
    for (;;) {
      const op = this.peekOp('*', '/')
      if (!op) return left
      this.pos++
      left = { type: 'binary', op, left, right: this.parseUnary() }
    }
  }

  private parseUnary(): Node {
    if (this.peekOp('!')) {
      this.pos++
      return { type: 'unary', op: '!', operand: this.parseUnary() }
    }
    if (this.peekOp('-')) {
      this.pos++
      return { type: 'unary', op: '-', operand: this.parseUnary() }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): Node {
    const t = this.tokens[this.pos]
    if (!t) throw new Error('表达式意外结束（unexpected end of expression）')
    if (t.type === 'num') {
      this.pos++
      return { type: 'literal', value: t.value }
    }
    if (t.type === 'str') {
      this.pos++
      return { type: 'literal', value: t.value }
    }
    if (t.type === 'ident') {
      this.pos++
      if (t.value === 'true') return { type: 'literal', value: true }
      if (t.value === 'false') return { type: 'literal', value: false }
      if (t.value === 'null') return { type: 'literal', value: null }
      return { type: 'ident', name: t.value }
    }
    if (t.type === 'op' && t.value === '(') {
      this.pos++
      const inner = this.parseOr()
      if (!this.peekOp(')')) throw new Error('缺少右括号（missing closing parenthesis）')
      this.pos++
      return inner
    }
    throw new Error(`无法解析的记号（unexpected token）: ${t.value}`)
  }
}

type Node =
  | { type: 'literal'; value: unknown }
  | { type: 'ident'; name: string }
  | { type: 'unary'; op: string; operand: Node }
  | { type: 'binary'; op: string; left: Node; right: Node }

function asNumber(v: unknown): number {
  if (typeof v === 'number') return v
  throw new Error(`需要数值（expected a number），得到: ${JSON.stringify(v)}`)
}

function evalNode(node: Node, scope: Scope): unknown {
  switch (node.type) {
    case 'literal':
      return node.value
    case 'ident': {
      if (!(node.name in scope)) {
        throw new Error(`未定义的标识符（unknown identifier）: ${node.name}`)
      }
      return scope[node.name]
    }
    case 'unary': {
      const v = evalNode(node.operand, scope)
      return node.op === '!' ? !v : -asNumber(v)
    }
    case 'binary': {
      const l = evalNode(node.left, scope)
      if (node.op === '&&') return Boolean(l) && Boolean(evalNode(node.right, scope))
      if (node.op === '||') return Boolean(l) || Boolean(evalNode(node.right, scope))
      const r = evalNode(node.right, scope)
      switch (node.op) {
        case '==':
          return l === r
        case '!=':
          return l !== r
        case '<':
          return asNumber(l) < asNumber(r)
        case '<=':
          return asNumber(l) <= asNumber(r)
        case '>':
          return asNumber(l) > asNumber(r)
        case '>=':
          return asNumber(l) >= asNumber(r)
        case '+':
          return typeof l === 'string' || typeof r === 'string'
            ? String(l) + String(r)
            : asNumber(l) + asNumber(r)
        case '-':
          return asNumber(l) - asNumber(r)
        case '*':
          return asNumber(l) * asNumber(r)
        case '/':
          return asNumber(l) / asNumber(r)
        default:
          throw new Error(`不支持的运算符（unsupported operator）: ${node.op}`)
      }
    }
  }
}

/**
 * Parses and evaluates an expression against a scope of identifier bindings.
 * @param src expression source text
 * @param scope identifier bindings (e.g. instance property values)
 * @returns the evaluated value
 */
export function evaluate(src: string, scope: Scope): unknown {
  return evalNode(new Parser(tokenize(src)).parse(), scope)
}

/**
 * Checks that an expression parses.
 * @param src expression source text
 * @returns null when valid, otherwise the parse error message
 */
export function checkSyntax(src: string): string | null {
  try {
    new Parser(tokenize(src)).parse()
    return null
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}
