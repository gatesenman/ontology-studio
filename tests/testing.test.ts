import { describe, expect, it } from 'vitest'
import { sampleOntology } from '../src/core/sample.ts'
import { checkInstances, runMetric, runRule } from '../src/core/testing.ts'

describe('rule runner', () => {
  it('tallies passing and failing instances', () => {
    const o = sampleOntology()
    const result = runRule(o, o.rules[0])
    expect(result.passed).toBe(2)
    expect(result.failed).toBe(1)
    expect(result.failures).toEqual([{ instanceId: 'inst-3' }])
    expect(result.errors).toEqual([])
  })

  it('reports evaluation errors per instance', () => {
    const o = sampleOntology()
    o.rules[0].expression = 'nonexistent > 1'
    const result = runRule(o, o.rules[0])
    expect(result.errors.length).toBe(3)
  })
})

describe('metric runner', () => {
  it('computes count with a filter', () => {
    const o = sampleOntology()
    const result = runMetric(o, o.metrics[0])
    expect(result.value).toBe(2)
    expect(result.matched).toBe(2)
  })

  it('computes sum over a numeric property', () => {
    const o = sampleOntology()
    const result = runMetric(o, o.metrics[1])
    expect(result.value).toBeCloseTo(1280.5)
  })

  it('computes avg, min, and max', () => {
    const o = sampleOntology()
    const base = o.metrics[1]
    expect(runMetric(o, { ...base, aggregation: 'avg' }).value).toBeCloseTo(1280.5 / 3)
    expect(runMetric(o, { ...base, aggregation: 'min' }).value).toBe(0)
    expect(runMetric(o, { ...base, aggregation: 'max' }).value).toBe(1200.5)
  })

  it('reports filter evaluation errors', () => {
    const o = sampleOntology()
    const result = runMetric(o, { ...o.metrics[0], filter: 'bogus >' })
    expect(result.error).toBeTruthy()
  })
})

describe('instance schema check', () => {
  it('accepts well-typed instances and flags problems', () => {
    const o = sampleOntology()
    const results = checkInstances(o)
    expect(results.every((r) => r.problems.length === 0)).toBe(true)

    o.sampleInstances.push({
      id: 'inst-bad',
      objectTypeId: 'ot-shipment',
      values: { shipmentId: 5, delivered: 'yes', extra: 1 },
    })
    const bad = checkInstances(o).find((r) => r.instanceId === 'inst-bad')!
    expect(bad.problems).toContain('属性 “shipmentId” 的类型不是 string')
    expect(bad.problems).toContain('缺少必填属性 “weightKg”')
    expect(bad.problems).toContain('属性 “delivered” 的类型不是 boolean')
    expect(bad.problems).toContain('未知属性 “extra”')
  })

  it('checks array properties element-wise', () => {
    const o = sampleOntology()
    o.objectTypes[0].properties.push({
      apiName: 'tags',
      displayName: '标签',
      description: '',
      baseType: 'string',
      required: false,
      array: true,
    })
    o.sampleInstances.push({
      id: 'inst-arr',
      objectTypeId: 'ot-ship',
      values: { imo: 'X', name: 'Y', capacityKg: 1, tags: ['a', 2] },
    })
    const r = checkInstances(o).find((x) => x.instanceId === 'inst-arr')!
    expect(r.problems.some((p) => p.includes('tags'))).toBe(true)
  })
})
