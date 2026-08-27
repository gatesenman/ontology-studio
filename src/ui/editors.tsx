/** Per-kind entity editors and the new-entity factory. */
import type {
  ActionType,
  BaseType,
  LinkType,
  Metric,
  ObjectType,
  OntologyEntity,
  Ontology,
  ParameterDef,
  PropertyDef,
  Rule,
  ValueType,
  EntityKind,
} from '../core/types.ts'
import { BASE_TYPES } from '../core/types.ts'
import { newId } from '../core/store.ts'
import { NumberField, Row, SelectField, TextArea, TextField } from './fields.tsx'

/** Chinese display labels for each entity kind. */
export const KIND_LABELS: Record<EntityKind, string> = {
  objectType: '对象类型',
  linkType: '链接类型',
  actionType: '动作类型',
  valueType: '值类型',
  metric: '指标',
  rule: '规则',
}

/**
 * Creates a new entity of the given kind with sensible defaults.
 * @param kind entity kind to create
 * @param o current ontology, used to pick default references
 * @returns the new entity
 */
export function newEntity(kind: EntityKind, o: Ontology): OntologyEntity {
  const base = { apiName: 'newItem', displayName: '新条目', description: '' }
  const firstObjectType = o.objectTypes[0]?.id ?? ''
  switch (kind) {
    case 'valueType':
      return { ...base, kind, id: newId('vt'), baseType: 'string' }
    case 'objectType':
      return {
        ...base,
        kind,
        id: newId('ot'),
        properties: [
          { apiName: 'id', displayName: 'ID', description: '', baseType: 'string', required: true, array: false },
        ],
        primaryKey: 'id',
        titleProperty: 'id',
      }
    case 'linkType':
      return {
        ...base,
        kind,
        id: newId('lt'),
        sourceObjectTypeId: firstObjectType,
        targetObjectTypeId: firstObjectType,
        cardinality: 'ONE_TO_MANY',
      }
    case 'actionType':
      return { ...base, kind, id: newId('at'), parameters: [], modifies: [], submissionCriteria: [] }
    case 'metric':
      return { ...base, kind, id: newId('m'), objectTypeId: firstObjectType, aggregation: 'count' }
    case 'rule':
      return {
        ...base,
        kind,
        id: newId('rule'),
        objectTypeId: firstObjectType,
        expression: 'true',
        severity: 'error',
      }
  }
}

function CommonFields(props: { entity: OntologyEntity; onChange: (e: OntologyEntity) => void }) {
  const { entity, onChange } = props
  return (
    <>
      <Row>
        <div style={{ flex: 1 }}>
          <TextField
            label="显示名称"
            value={entity.displayName}
            onChange={(v) => onChange({ ...entity, displayName: v })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <TextField
            label="API 名称（lowerCamelCase）"
            mono
            value={entity.apiName}
            onChange={(v) => onChange({ ...entity, apiName: v })}
          />
        </div>
      </Row>
      <TextArea
        label="描述"
        value={entity.description}
        onChange={(v) => onChange({ ...entity, description: v })}
      />
    </>
  )
}

const baseTypeOptions = BASE_TYPES.map((b) => ({ value: b, label: b }))

function objectTypeOptions(o: Ontology) {
  return o.objectTypes.map((t) => ({ value: t.id, label: t.displayName }))
}

function ValueTypeEditor(props: { entity: ValueType; onChange: (e: ValueType) => void }) {
  const { entity, onChange } = props
  return (
    <>
      <SelectField
        label="基础类型"
        value={entity.baseType}
        options={baseTypeOptions}
        onChange={(v) => onChange({ ...entity, baseType: v as BaseType })}
      />
      <TextField
        label="正则约束（可选，仅字符串）"
        mono
        value={entity.pattern ?? ''}
        onChange={(v) => onChange({ ...entity, pattern: v === '' ? undefined : v })}
      />
      <Row>
        <NumberField label="最小值" value={entity.min} onChange={(v) => onChange({ ...entity, min: v })} />
        <NumberField label="最大值" value={entity.max} onChange={(v) => onChange({ ...entity, max: v })} />
      </Row>
      <TextField
        label="枚举值（逗号分隔，可选）"
        value={(entity.enumValues ?? []).join(',')}
        onChange={(v) =>
          onChange({
            ...entity,
            enumValues: v.trim() === '' ? undefined : v.split(',').map((s) => s.trim()),
          })
        }
      />
    </>
  )
}

function PropertyTable(props: {
  o: Ontology
  properties: PropertyDef[]
  onChange: (p: PropertyDef[]) => void
}) {
  const { o, properties, onChange } = props
  const update = (i: number, patch: Partial<PropertyDef>) =>
    onChange(properties.with(i, { ...properties[i], ...patch }))
  return (
    <>
      <h3 className="section">对象属性</h3>
      <table className="grid">
        <thead>
          <tr>
            <th>API 名称</th>
            <th>显示名称</th>
            <th>基础类型</th>
            <th>值类型</th>
            <th>必填</th>
            <th>数组</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {properties.map((p, i) => (
            <tr key={i}>
              <td>
                <input value={p.apiName} onChange={(e) => update(i, { apiName: e.target.value })} />
              </td>
              <td>
                <input
                  value={p.displayName}
                  onChange={(e) => update(i, { displayName: e.target.value })}
                />
              </td>
              <td>
                <select
                  value={p.baseType}
                  onChange={(e) => update(i, { baseType: e.target.value as BaseType })}
                >
                  {BASE_TYPES.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  value={p.valueTypeId ?? ''}
                  onChange={(e) =>
                    update(i, { valueTypeId: e.target.value === '' ? undefined : e.target.value })
                  }
                >
                  <option value="">（无）</option>
                  {o.valueTypes.map((vt) => (
                    <option key={vt.id} value={vt.id}>
                      {vt.displayName}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={p.required}
                  onChange={(e) => update(i, { required: e.target.checked })}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={p.array}
                  onChange={(e) => update(i, { array: e.target.checked })}
                />
              </td>
              <td>
                <button className="danger" onClick={() => onChange(properties.filter((_, j) => j !== i))}>
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="ghost"
        onClick={() =>
          onChange([
            ...properties,
            {
              apiName: `prop${properties.length + 1}`,
              displayName: '新属性',
              description: '',
              baseType: 'string',
              required: false,
              array: false,
            },
          ])
        }
      >
        + 添加属性
      </button>
    </>
  )
}

function ObjectTypeEditor(props: { o: Ontology; entity: ObjectType; onChange: (e: ObjectType) => void }) {
  const { o, entity, onChange } = props
  const propOptions = entity.properties.map((p) => ({ value: p.apiName, label: p.apiName }))
  return (
    <>
      <PropertyTable o={o} properties={entity.properties} onChange={(p) => onChange({ ...entity, properties: p })} />
      <Row>
        <div>
          <SelectField
            label="主键属性"
            value={entity.primaryKey}
            options={propOptions}
            onChange={(v) => onChange({ ...entity, primaryKey: v })}
          />
        </div>
        <div>
          <SelectField
            label="标题属性"
            value={entity.titleProperty}
            options={propOptions}
            onChange={(v) => onChange({ ...entity, titleProperty: v })}
          />
        </div>
      </Row>
    </>
  )
}

function LinkTypeEditor(props: { o: Ontology; entity: LinkType; onChange: (e: LinkType) => void }) {
  const { o, entity, onChange } = props
  return (
    <Row>
      <div>
        <SelectField
          label="源对象类型"
          value={entity.sourceObjectTypeId}
          options={objectTypeOptions(o)}
          onChange={(v) => onChange({ ...entity, sourceObjectTypeId: v })}
        />
      </div>
      <div>
        <SelectField
          label="目标对象类型"
          value={entity.targetObjectTypeId}
          options={objectTypeOptions(o)}
          onChange={(v) => onChange({ ...entity, targetObjectTypeId: v })}
        />
      </div>
      <div>
        <SelectField
          label="基数"
          value={entity.cardinality}
          options={[
            { value: 'ONE_TO_ONE', label: '一对一' },
            { value: 'ONE_TO_MANY', label: '一对多' },
            { value: 'MANY_TO_MANY', label: '多对多' },
          ]}
          onChange={(v) => onChange({ ...entity, cardinality: v as LinkType['cardinality'] })}
        />
      </div>
    </Row>
  )
}

function ParameterTable(props: { parameters: ParameterDef[]; onChange: (p: ParameterDef[]) => void }) {
  const { parameters, onChange } = props
  const update = (i: number, patch: Partial<ParameterDef>) =>
    onChange(parameters.with(i, { ...parameters[i], ...patch }))
  return (
    <>
      <h3 className="section">参数</h3>
      <table className="grid">
        <thead>
          <tr>
            <th>API 名称</th>
            <th>显示名称</th>
            <th>类型</th>
            <th>必填</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((p, i) => (
            <tr key={i}>
              <td>
                <input value={p.apiName} onChange={(e) => update(i, { apiName: e.target.value })} />
              </td>
              <td>
                <input value={p.displayName} onChange={(e) => update(i, { displayName: e.target.value })} />
              </td>
              <td>
                <select value={p.baseType} onChange={(e) => update(i, { baseType: e.target.value as BaseType })}>
                  {BASE_TYPES.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={p.required}
                  onChange={(e) => update(i, { required: e.target.checked })}
                />
              </td>
              <td>
                <button className="danger" onClick={() => onChange(parameters.filter((_, j) => j !== i))}>
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="ghost"
        onClick={() =>
          onChange([
            ...parameters,
            { apiName: `param${parameters.length + 1}`, displayName: '新参数', baseType: 'string', required: true },
          ])
        }
      >
        + 添加参数
      </button>
    </>
  )
}

function ActionTypeEditor(props: { o: Ontology; entity: ActionType; onChange: (e: ActionType) => void }) {
  const { o, entity, onChange } = props
  const updateModify = (i: number, patch: Partial<ActionType['modifies'][number]>) =>
    onChange({ ...entity, modifies: entity.modifies.with(i, { ...entity.modifies[i], ...patch }) })
  return (
    <>
      <ParameterTable parameters={entity.parameters} onChange={(p) => onChange({ ...entity, parameters: p })} />
      <h3 className="section">修改目标</h3>
      <table className="grid">
        <thead>
          <tr>
            <th>对象类型</th>
            <th>操作</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entity.modifies.map((m, i) => (
            <tr key={i}>
              <td>
                <select value={m.objectTypeId} onChange={(e) => updateModify(i, { objectTypeId: e.target.value })}>
                  {o.objectTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.displayName}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  value={m.operation}
                  onChange={(e) => updateModify(i, { operation: e.target.value as ActionType['modifies'][number]['operation'] })}
                >
                  <option value="create">创建</option>
                  <option value="modify">修改</option>
                  <option value="delete">删除</option>
                </select>
              </td>
              <td>
                <button
                  className="danger"
                  onClick={() => onChange({ ...entity, modifies: entity.modifies.filter((_, j) => j !== i) })}
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="ghost"
        disabled={o.objectTypes.length === 0}
        onClick={() =>
          onChange({
            ...entity,
            modifies: [...entity.modifies, { objectTypeId: o.objectTypes[0].id, operation: 'modify' }],
          })
        }
      >
        + 添加修改目标
      </button>
      <h3 className="section">提交条件（规则）</h3>
      <div className="field">
        {o.rules.length === 0 ? (
          <span className="muted">尚未定义任何规则</span>
        ) : (
          o.rules.map((r) => (
            <label key={r.id} style={{ display: 'block', color: 'var(--text)' }}>
              <input
                type="checkbox"
                checked={entity.submissionCriteria.includes(r.id)}
                onChange={(e) =>
                  onChange({
                    ...entity,
                    submissionCriteria: e.target.checked
                      ? [...entity.submissionCriteria, r.id]
                      : entity.submissionCriteria.filter((id) => id !== r.id),
                  })
                }
              />{' '}
              {r.displayName}
            </label>
          ))
        )}
      </div>
    </>
  )
}

function MetricEditor(props: { o: Ontology; entity: Metric; onChange: (e: Metric) => void }) {
  const { o, entity, onChange } = props
  const objectType = o.objectTypes.find((t) => t.id === entity.objectTypeId)
  const numericProps = (objectType?.properties ?? []).filter(
    (p) => p.baseType === 'integer' || p.baseType === 'double',
  )
  return (
    <>
      <Row>
        <div>
          <SelectField
            label="对象类型"
            value={entity.objectTypeId}
            options={objectTypeOptions(o)}
            onChange={(v) => onChange({ ...entity, objectTypeId: v })}
          />
        </div>
        <div>
          <SelectField
            label="聚合方式"
            value={entity.aggregation}
            options={[
              { value: 'count', label: 'count（计数）' },
              { value: 'sum', label: 'sum（求和）' },
              { value: 'avg', label: 'avg（平均）' },
              { value: 'min', label: 'min（最小）' },
              { value: 'max', label: 'max（最大）' },
            ]}
            onChange={(v) => onChange({ ...entity, aggregation: v as Metric['aggregation'] })}
          />
        </div>
        {entity.aggregation !== 'count' && (
          <div>
            <SelectField
              label="聚合属性（数值）"
              value={entity.propertyApiName ?? ''}
              options={[{ value: '', label: '（选择）' }, ...numericProps.map((p) => ({ value: p.apiName, label: p.apiName }))]}
              onChange={(v) => onChange({ ...entity, propertyApiName: v === '' ? undefined : v })}
            />
          </div>
        )}
      </Row>
      <TextField
        label="过滤表达式（可选，如 delivered == false）"
        mono
        value={entity.filter ?? ''}
        onChange={(v) => onChange({ ...entity, filter: v === '' ? undefined : v })}
      />
    </>
  )
}

function RuleEditor(props: { o: Ontology; entity: Rule; onChange: (e: Rule) => void }) {
  const { o, entity, onChange } = props
  return (
    <>
      <Row>
        <div>
          <SelectField
            label="对象类型"
            value={entity.objectTypeId}
            options={objectTypeOptions(o)}
            onChange={(v) => onChange({ ...entity, objectTypeId: v })}
          />
        </div>
        <div>
          <SelectField
            label="严重级别"
            value={entity.severity}
            options={[
              { value: 'error', label: 'error（错误）' },
              { value: 'warning', label: 'warning（警告）' },
            ]}
            onChange={(v) => onChange({ ...entity, severity: v as Rule['severity'] })}
          />
        </div>
      </Row>
      <TextArea
        label="规则表达式（基于对象属性，如 weightKg > 0）"
        value={entity.expression}
        onChange={(v) => onChange({ ...entity, expression: v })}
      />
    </>
  )
}

/** Renders the editor for one entity, dispatching on its kind. */
export function EntityEditor(props: {
  o: Ontology
  entity: OntologyEntity
  onChange: (e: OntologyEntity) => void
}) {
  const { o, entity, onChange } = props
  return (
    <>
      <CommonFields entity={entity} onChange={onChange} />
      {entity.kind === 'valueType' && <ValueTypeEditor entity={entity} onChange={onChange} />}
      {entity.kind === 'objectType' && <ObjectTypeEditor o={o} entity={entity} onChange={onChange} />}
      {entity.kind === 'linkType' && <LinkTypeEditor o={o} entity={entity} onChange={onChange} />}
      {entity.kind === 'actionType' && <ActionTypeEditor o={o} entity={entity} onChange={onChange} />}
      {entity.kind === 'metric' && <MetricEditor o={o} entity={entity} onChange={onChange} />}
      {entity.kind === 'rule' && <RuleEditor o={o} entity={entity} onChange={onChange} />}
    </>
  )
}
