/** Testing panel: ontology validation, rule runs, metric computation, and instance type-checks. */
import { useMemo } from 'react'
import { checkInstances, runMetric, runRule } from '../core/testing.ts'
import { validateOntology } from '../core/validate.ts'
import type { Ontology } from '../core/types.ts'
import { KIND_LABELS } from './editors.tsx'

/** The full testing view over the current ontology. */
export function TestPanel(props: { o: Ontology }) {
  const { o } = props
  const issues = useMemo(() => validateOntology(o), [o])
  const ruleResults = useMemo(() => o.rules.map((r) => runRule(o, r)), [o])
  const metricResults = useMemo(() => o.metrics.map((m) => runMetric(o, m)), [o])
  const instanceChecks = useMemo(() => checkInstances(o), [o])
  const errorCount = issues.filter((i) => i.severity === 'error').length

  return (
    <div className="editor-pane">
      <h3 className="section">本体校验（Ontology Validation）</h3>
      {issues.length === 0 ? (
        <p>
          <span className="badge ok">通过</span> 本体一致，无校验问题。
        </p>
      ) : (
        <>
          <p>
            {errorCount > 0 && <span className="badge error">{errorCount} 个错误</span>}
            {issues.length - errorCount > 0 && (
              <span className="badge warning">{issues.length - errorCount} 个警告</span>
            )}
          </p>
          {issues.map((issue, i) => (
            <div key={i} className={`issue ${issue.severity}`}>
              <span className="who">
                [{issue.entityKind === 'ontology' ? '本体' : KIND_LABELS[issue.entityKind]}] {issue.entityName}
              </span>
              <div>{issue.message}</div>
            </div>
          ))}
        </>
      )}

      <h3 className="section">规则测试（Rules × 样本实例）</h3>
      {ruleResults.length === 0 && <p className="muted">尚未定义规则。</p>}
      {ruleResults.map((r) => (
        <div key={r.ruleId} className="result-card">
          <h4>
            {r.ruleName}
            {r.failed === 0 && r.errors.length === 0 ? (
              <span className="badge ok">通过 {r.passed}</span>
            ) : (
              <span className={`badge ${r.severity}`}>
                通过 {r.passed} / 失败 {r.failed}
              </span>
            )}
          </h4>
          {r.failures.length > 0 && (
            <p className="mono muted">违反实例: {r.failures.map((f) => f.instanceId).join(', ')}</p>
          )}
          {r.errors.map((e, i) => (
            <p key={i} className="mono" style={{ color: 'var(--error)' }}>
              {e}
            </p>
          ))}
        </div>
      ))}

      <h3 className="section">指标计算（Metrics）</h3>
      {metricResults.length === 0 && <p className="muted">尚未定义指标。</p>}
      {metricResults.map((m) => (
        <div key={m.metricId} className="result-card">
          <h4>
            {m.metricName}
            <span className="badge ok">{m.value === null ? '—' : m.value}</span>
          </h4>
          <p className="muted">匹配实例数: {m.matched}</p>
          {m.error !== null && (
            <p className="mono" style={{ color: 'var(--error)' }}>
              {m.error}
            </p>
          )}
        </div>
      ))}

      <h3 className="section">样本实例类型检查（Schema Check）</h3>
      {instanceChecks.length === 0 && <p className="muted">尚未添加样本实例。</p>}
      {instanceChecks.map((c) => (
        <div key={c.instanceId} className="result-card">
          <h4>
            {c.instanceId} <span className="muted">（{c.objectTypeName}）</span>
            {c.problems.length === 0 ? (
              <span className="badge ok">通过</span>
            ) : (
              <span className="badge error">{c.problems.length} 个问题</span>
            )}
          </h4>
          {c.problems.map((p, i) => (
            <p key={i} className="mono" style={{ color: 'var(--error)' }}>
              {p}
            </p>
          ))}
        </div>
      ))}

    </div>
  )
}
