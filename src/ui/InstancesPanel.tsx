/** Sample-instance editor: JSON values per instance, used by the testing panel. */
import { useState } from 'react'
import { newId } from '../core/store.ts'
import type { Ontology, SampleInstance } from '../core/types.ts'

function InstanceCard(props: {
  o: Ontology
  instance: SampleInstance
  onChange: (s: SampleInstance) => void
  onRemove: () => void
}) {
  const { o, instance, onChange, onRemove } = props
  const [draft, setDraft] = useState(JSON.stringify(instance.values, null, 2))
  const [error, setError] = useState<string | null>(null)
  const apply = () => {
    try {
      const parsed: unknown = JSON.parse(draft)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('必须是 JSON 对象')
      }
      onChange({ ...instance, values: parsed as Record<string, unknown> })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <div className="result-card">
      <h4 className="mono">{instance.id}</h4>
      <div className="field">
        <label>对象类型</label>
        <select
          value={instance.objectTypeId}
          onChange={(e) => onChange({ ...instance, objectTypeId: e.target.value })}
        >
          {o.objectTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.displayName}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>属性值（JSON）</label>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} />
      </div>
      {error !== null && (
        <p className="mono" style={{ color: 'var(--error)' }}>
          {error}
        </p>
      )}
      <button className="primary" onClick={apply}>
        应用
      </button>{' '}
      <button className="danger" onClick={onRemove}>
        删除实例
      </button>
    </div>
  )
}

/** Editor list over all sample instances. */
export function InstancesPanel(props: {
  o: Ontology
  onUpsert: (s: SampleInstance) => void
  onRemove: (id: string) => void
}) {
  const { o, onUpsert, onRemove } = props
  return (
    <div className="editor-pane">
      <h3 className="section">样本实例（用于规则/指标测试）</h3>
      <p>
        <button
          className="primary"
          disabled={o.objectTypes.length === 0}
          onClick={() =>
            onUpsert({ id: newId('inst'), objectTypeId: o.objectTypes[0].id, values: {} })
          }
        >
          + 添加样本实例
        </button>
      </p>
      {o.sampleInstances.length === 0 && <p className="muted">尚未添加样本实例。</p>}
      {o.sampleInstances.map((s) => (
        <InstanceCard
          key={s.id}
          o={o}
          instance={s}
          onChange={onUpsert}
          onRemove={() => onRemove(s.id)}
        />
      ))}
    </div>
  )
}
