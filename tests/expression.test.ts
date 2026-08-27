import { describe, expect, it } from 'vitest'
import { checkSyntax, evaluate } from '../src/core/expression.ts'

describe('expression engine', () => {
  it('evaluates arithmetic with precedence', () => {
    expect(evaluate('1 + 2 * 3', {})).toBe(7)
    expect(evaluate('(1 + 2) * 3', {})).toBe(9)
    expect(evaluate('-4 + 10 / 2', {})).toBe(1)
  })

  it('evaluates comparisons and boolean logic', () => {
    expect(evaluate('weightKg > 0 && delivered == false', { weightKg: 5, delivered: false })).toBe(true)
    expect(evaluate('a >= 3 || b < 1', { a: 2, b: 0 })).toBe(true)
    expect(evaluate('not (x == 1)', { x: 2 })).toBe(true)
    expect(evaluate('a == 1 and b == 2', { a: 1, b: 2 })).toBe(true)
  })

  it('evaluates string literals and concatenation', () => {
    expect(evaluate('name == "远望号"', { name: '远望号' })).toBe(true)
    expect(evaluate('"S-" + id', { id: '001' })).toBe('S-001')
  })

  it('rejects unknown identifiers', () => {
    expect(() => evaluate('missing > 1', {})).toThrow(/unknown identifier/)
  })

  it('rejects non-numeric operands to ordering comparisons', () => {
    expect(() => evaluate('a < 3', { a: 'x' })).toThrow(/expected a number/)
  })

  it('checkSyntax reports parse errors without throwing', () => {
    expect(checkSyntax('a > 1')).toBeNull()
    expect(checkSyntax('a >')).toMatch(/unexpected end/)
    expect(checkSyntax('(a > 1')).toMatch(/missing closing/)
    expect(checkSyntax('a > 1 extra ~')).toBeTruthy()
  })
})
