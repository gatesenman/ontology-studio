/** Ontology testing engine: runs rules and metrics against sample instances. */
import { evaluate } from './expression.ts'
import type { BaseType, Metric, Ontology, PropertyDef, Rule, SampleInstance } from './types.ts'

export interface RuleResult {
  ruleId: string
  ruleName: string
  severity: Rule['severity']
  passed: number
  failed: number
  errors: string[]
  failures: { instanceId: string }[]
}

export interface MetricResult {
  metricId: string
  metricName: string
  value: number | null
  matched: number
  error: string | null
}

export interface TypeCheckResult {
  instanceId: string
  objectTypeName: string
  problems: string[]
}

function scopeOf(instance: SampleInstance): Record<string, unknown> {
  return { ...instance.values }
}

/**
 * Runs one rule against all sample instances of its object type.
 * @param o ontology providing instances
 * @param rule rule to evaluate
 * @returns per-rule pass/fail tallies and evaluation errors
 */
export function runRule(o: Ontology, rule: Rule): RuleResult {
  const result: RuleResult = {
    ruleId: rule.id,
    ruleName: rule.displayName,
    severity: rule.severity,
    passed: 0,
    failed: 0,
    errors: [],
    failures: [],
  }
  const instances = o.sampleInstances.filter((s) => s.objectTypeId === rule.objectTypeId)
  for (const inst of instances) {
    try {
      if (evaluate(rule.expression, scopeOf(inst))) {
        result.passed++
      } else {
        result.failed++
        result.failures.push({ instanceId: inst.id })
      }
    } catch (e) {
      result.errors.push(`${inst.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return result
}

/**
 * Computes one metric over all sample instances of its object type.
 * @param o ontology providing instances
 * @param metric metric to compute
 * @returns aggregated value, matched-instance count, and any evaluation error
 */
export function runMetric(o: Ontology, metric: Metric): MetricResult {
  const result: MetricResult = {
    metricId: metric.id,
    metricName: metric.displayName,
    value: null,
    matched: 0,
    error: null,
  }
  let instances = o.sampleInstances.filter((s) => s.objectTypeId === metric.objectTypeId)
  try {
    if (metric.filter !== undefined && metric.filter.trim() !== '') {
      instances = instances.filter((inst) => Boolean(evaluate(metric.filter!, scopeOf(inst))))
    }
    result.matched = instances.length
    if (metric.aggregation === 'count') {
      result.value = instances.length
      return result
    }
    const nums = instances
      .map((inst) => inst.values[metric.propertyApiName ?? ''])
      .filter((v): v is number => typeof v === 'number')
    if (nums.length === 0) {
      result.value = null
      return result
    }
    switch (metric.aggregation) {
      case 'sum':
        result.value = nums.reduce((a, b) => a + b, 0)
        break
      case 'avg':
        result.value = nums.reduce((a, b) => a + b, 0) / nums.length
        break
      case 'min':
        result.value = Math.min(...nums)
        break
      case 'max':
        result.value = Math.max(...nums)
        break
    }
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e)
  }
  return result
}

function typeOk(value: unknown, baseType: BaseType): boolean {
  switch (baseType) {
    case 'string':
    case 'date':
    case 'timestamp':
    case 'geopoint':
      return typeof value === 'string'
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value)
    case 'double':
      return typeof value === 'number'
    case 'boolean':
      return typeof value === 'boolean'
  }
}

function checkProperty(p: PropertyDef, value: unknown, problems: string[]): void {
  if (value === undefined || value === null) {
    if (p.required) problems.push(`缺少必填属性 “${p.apiName}”`)
    return
  }
  if (p.array) {
    if (!Array.isArray(value)) {
      problems.push(`属性 “${p.apiName}” 应为数组`)
      return
    }
    for (const item of value) {
      if (!typeOk(item, p.baseType)) {
        problems.push(`属性 “${p.apiName}” 的元素类型不是 ${p.baseType}`)
        return
      }
    }
    return
  }
  if (!typeOk(value, p.baseType)) {
    problems.push(`属性 “${p.apiName}” 的类型不是 ${p.baseType}`)
  }
}

/**
 * Type-checks every sample instance against its object type's property schema.
 * @param o ontology providing object types and instances
 * @returns one entry per instance with its schema problems (possibly empty)
 */
export function checkInstances(o: Ontology): TypeCheckResult[] {
  return o.sampleInstances.map((inst) => {
    const objectType = o.objectTypes.find((t) => t.id === inst.objectTypeId)
    const problems: string[] = []
    if (!objectType) {
      return { instanceId: inst.id, objectTypeName: '?', problems: ['对象类型不存在'] }
    }
    for (const p of objectType.properties) {
      checkProperty(p, inst.values[p.apiName], problems)
    }
    for (const key of Object.keys(inst.values)) {
      if (!objectType.properties.some((p) => p.apiName === key)) {
        problems.push(`未知属性 “${key}”`)
      }
    }
    return { instanceId: inst.id, objectTypeName: objectType.displayName, problems }
  })
}
