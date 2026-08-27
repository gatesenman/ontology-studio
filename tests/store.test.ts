import { describe, expect, it } from 'vitest'
import { sampleOntology } from '../src/core/sample.ts'
import { parseOntology, stringifyOntology } from '../src/core/serialize.ts'
import { newId, ontologyReducer } from '../src/core/store.ts'
import { emptyOntology, type Rule } from '../src/core/types.ts'

describe('ontologyReducer', () => {
  it('upserts and removes entities without mutating input', () => {
    const before = emptyOntology()
    const rule: Rule = {
      kind: 'rule',
      id: 'r1',
      apiName: 'r',
      displayName: 'R',
      description: '',
      objectTypeId: 'x',
      expression: 'true',
      severity: 'error',
    }
    const withRule = ontologyReducer(before, { type: 'upsert', entity: rule })
    expect(before.rules).toEqual([])
    expect(withRule.rules).toEqual([rule])

    const updated = ontologyReducer(withRule, {
      type: 'upsert',
      entity: { ...rule, displayName: 'R2' },
    })
    expect(updated.rules).toHaveLength(1)
    expect(updated.rules[0].displayName).toBe('R2')

    const removed = ontologyReducer(updated, { type: 'remove', kind: 'rule', id: 'r1' })
    expect(removed.rules).toEqual([])
  })

  it('manages sample instances', () => {
    const o = emptyOntology()
    const inst = { id: 'i1', objectTypeId: 'ot', values: { a: 1 } }
    const added = ontologyReducer(o, { type: 'upsertInstance', instance: inst })
    expect(added.sampleInstances).toEqual([inst])
    const removed = ontologyReducer(added, { type: 'removeInstance', id: 'i1' })
    expect(removed.sampleInstances).toEqual([])
  })

  it('generates unique ids', () => {
    expect(newId('x')).not.toBe(newId('x'))
  })
})

describe('serialization', () => {
  it('round-trips the sample ontology', () => {
    const o = sampleOntology()
    expect(parseOntology(stringifyOntology(o))).toEqual(o)
  })

  it('rejects unknown format versions', () => {
    expect(() => parseOntology('{"formatVersion":99}')).toThrow(/formatVersion/)
  })

  it('rejects non-array collection fields', () => {
    expect(() => parseOntology('{"formatVersion":1,"rules":{}}')).toThrow(/必须是数组/)
  })
})
