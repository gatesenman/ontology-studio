import { describe, expect, it } from 'vitest'
import { sampleOntology } from '../src/core/sample.ts'
import { validateOntology } from '../src/core/validate.ts'

describe('validateOntology', () => {
  it('accepts the bundled sample ontology', () => {
    expect(validateOntology(sampleOntology())).toEqual([])
  })

  it('rejects bad apiName format', () => {
    const o = sampleOntology()
    o.rules[0].apiName = 'Bad-Name'
    const issues = validateOntology(o)
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('lowerCamelCase'))).toBe(true)
  })

  it('rejects duplicate apiNames within a kind', () => {
    const o = sampleOntology()
    o.objectTypes[1].apiName = o.objectTypes[0].apiName
    expect(validateOntology(o).some((i) => i.message.includes('重复'))).toBe(true)
  })

  it('rejects dangling link type references', () => {
    const o = sampleOntology()
    o.linkTypes[0].targetObjectTypeId = 'missing'
    expect(validateOntology(o).some((i) => i.entityKind === 'linkType')).toBe(true)
  })

  it('rejects a primary key that is not a property', () => {
    const o = sampleOntology()
    o.objectTypes[0].primaryKey = 'nope'
    expect(validateOntology(o).some((i) => i.message.includes('主键'))).toBe(true)
  })

  it('rejects invalid rule expressions', () => {
    const o = sampleOntology()
    o.rules[0].expression = 'weightKg >'
    expect(validateOntology(o).some((i) => i.entityKind === 'rule')).toBe(true)
  })

  it('rejects a non-numeric metric aggregation property', () => {
    const o = sampleOntology()
    o.metrics[1].propertyApiName = 'shipmentId'
    expect(validateOntology(o).some((i) => i.entityKind === 'metric')).toBe(true)
  })

  it('rejects action submission criteria pointing at missing rules', () => {
    const o = sampleOntology()
    o.actionTypes[0].submissionCriteria = ['missing-rule']
    expect(validateOntology(o).some((i) => i.entityKind === 'actionType')).toBe(true)
  })
})
