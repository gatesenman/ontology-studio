/** Ontology validation: identifier hygiene plus cross-entity referential integrity. */
import { checkSyntax } from './expression.ts'
import type { EntityKind, Ontology } from './types.ts'

export interface ValidationIssue {
  severity: 'error' | 'warning'
  entityKind: EntityKind | 'ontology'
  entityId: string
  entityName: string
  message: string
}

const API_NAME = /^[a-z][A-Za-z0-9]*$/

/**
 * Validates an ontology document.
 * @param o ontology to validate
 * @returns all issues found; an empty array means the ontology is consistent
 */
export function validateOntology(o: Ontology): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const push = (
    severity: ValidationIssue['severity'],
    entityKind: ValidationIssue['entityKind'],
    entityId: string,
    entityName: string,
    message: string,
  ) => issues.push({ severity, entityKind, entityId, entityName, message })

  const objectTypeIds = new Set(o.objectTypes.map((t) => t.id))
  const valueTypeIds = new Set(o.valueTypes.map((t) => t.id))
  const ruleIds = new Set(o.rules.map((r) => r.id))

  const allEntities = [
    ...o.valueTypes,
    ...o.objectTypes,
    ...o.linkTypes,
    ...o.actionTypes,
    ...o.metrics,
    ...o.rules,
  ]
  const seen = new Map<string, string>()
  for (const e of allEntities) {
    if (!API_NAME.test(e.apiName)) {
      push('error', e.kind, e.id, e.displayName, `API 名称 “${e.apiName}” 必须是 lowerCamelCase`)
    }
    const key = `${e.kind}:${e.apiName}`
    const prior = seen.get(key)
    if (prior !== undefined) {
      push('error', e.kind, e.id, e.displayName, `API 名称 “${e.apiName}” 与 “${prior}” 重复`)
    } else {
      seen.set(key, e.displayName)
    }
  }

  for (const t of o.objectTypes) {
    const propNames = new Set<string>()
    for (const p of t.properties) {
      if (!API_NAME.test(p.apiName)) {
        push('error', 'objectType', t.id, t.displayName, `属性 “${p.apiName}” 必须是 lowerCamelCase`)
      }
      if (propNames.has(p.apiName)) {
        push('error', 'objectType', t.id, t.displayName, `属性 “${p.apiName}” 重复`)
      }
      propNames.add(p.apiName)
      if (p.valueTypeId !== undefined && !valueTypeIds.has(p.valueTypeId)) {
        push('error', 'objectType', t.id, t.displayName, `属性 “${p.apiName}” 引用了不存在的值类型`)
      }
    }
    if (t.properties.length === 0) {
      push('warning', 'objectType', t.id, t.displayName, '对象类型没有任何属性')
    } else {
      if (!propNames.has(t.primaryKey)) {
        push('error', 'objectType', t.id, t.displayName, `主键 “${t.primaryKey}” 不是已定义的属性`)
      }
      if (!propNames.has(t.titleProperty)) {
        push('error', 'objectType', t.id, t.displayName, `标题属性 “${t.titleProperty}” 不是已定义的属性`)
      }
    }
  }

  for (const l of o.linkTypes) {
    if (!objectTypeIds.has(l.sourceObjectTypeId)) {
      push('error', 'linkType', l.id, l.displayName, '源对象类型不存在')
    }
    if (!objectTypeIds.has(l.targetObjectTypeId)) {
      push('error', 'linkType', l.id, l.displayName, '目标对象类型不存在')
    }
  }

  for (const a of o.actionTypes) {
    for (const m of a.modifies) {
      if (!objectTypeIds.has(m.objectTypeId)) {
        push('error', 'actionType', a.id, a.displayName, '修改的对象类型不存在')
      }
    }
    for (const rid of a.submissionCriteria) {
      if (!ruleIds.has(rid)) {
        push('error', 'actionType', a.id, a.displayName, '提交条件引用了不存在的规则')
      }
    }
    if (a.modifies.length === 0) {
      push('warning', 'actionType', a.id, a.displayName, '动作类型未声明任何修改目标')
    }
  }

  for (const m of o.metrics) {
    const objectType = o.objectTypes.find((t) => t.id === m.objectTypeId)
    if (!objectType) {
      push('error', 'metric', m.id, m.displayName, '统计的对象类型不存在')
    } else if (m.aggregation !== 'count') {
      const prop = objectType.properties.find((p) => p.apiName === m.propertyApiName)
      if (!prop) {
        push('error', 'metric', m.id, m.displayName, `聚合属性 “${m.propertyApiName ?? ''}” 不存在`)
      } else if (prop.baseType !== 'integer' && prop.baseType !== 'double') {
        push('error', 'metric', m.id, m.displayName, `聚合属性 “${prop.apiName}” 不是数值类型`)
      }
    }
    if (m.filter !== undefined && m.filter.trim() !== '') {
      const err = checkSyntax(m.filter)
      if (err !== null) {
        push('error', 'metric', m.id, m.displayName, `过滤表达式无效: ${err}`)
      }
    }
  }

  for (const r of o.rules) {
    if (!objectTypeIds.has(r.objectTypeId)) {
      push('error', 'rule', r.id, r.displayName, '约束的对象类型不存在')
    }
    const err = checkSyntax(r.expression)
    if (err !== null) {
      push('error', 'rule', r.id, r.displayName, `规则表达式无效: ${err}`)
    }
  }

  for (const s of o.sampleInstances) {
    if (!objectTypeIds.has(s.objectTypeId)) {
      push('error', 'ontology', s.id, s.id, '样本实例引用了不存在的对象类型')
    }
  }

  return issues
}
