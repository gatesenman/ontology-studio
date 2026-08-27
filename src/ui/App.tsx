/** Application shell: sidebar navigation, entity CRUD, persistence, and the testing view. */
import { useEffect, useMemo, useReducer, useState } from 'react'
import { bridge } from '../bridge.ts'
import { sampleOntology } from '../core/sample.ts'
import { parseOntology, stringifyOntology } from '../core/serialize.ts'
import { KIND_FIELD, ontologyReducer } from '../core/store.ts'
import { emptyOntology } from '../core/types.ts'
import type { EntityKind, OntologyEntity } from '../core/types.ts'
import { validateOntology } from '../core/validate.ts'
import { EntityEditor, KIND_LABELS, newEntity } from './editors.tsx'
import { InstancesPanel } from './InstancesPanel.tsx'
import { TestPanel } from './TestPanel.tsx'

const KINDS: EntityKind[] = [
  'objectType',
  'linkType',
  'actionType',
  'valueType',
  'metric',
  'rule',
]

type Section = EntityKind | 'instances' | 'testing'

export function App() {
  const [ontology, dispatch] = useReducer(ontologyReducer, undefined, () => emptyOntology())
  const [section, setSection] = useState<Section>('objectType')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void bridge.load().then((json) => {
      if (json !== null) {
        try {
          dispatch({ type: 'set', ontology: parseOntology(json) })
        } catch {
          dispatch({ type: 'set', ontology: sampleOntology() })
        }
      } else {
        dispatch({ type: 'set', ontology: sampleOntology() })
      }
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (loaded) void bridge.save(stringifyOntology(ontology))
  }, [ontology, loaded])

  const issues = useMemo(() => validateOntology(ontology), [ontology])
  const errorCount = issues.filter((i) => i.severity === 'error').length

  const entities: OntologyEntity[] =
    section !== 'instances' && section !== 'testing' ? ontology[KIND_FIELD[section]] : []
  const selected = entities.find((e) => e.id === selectedId) ?? null

  const importOntology = async () => {
    const json = await bridge.importFile()
    if (json === null) return
    try {
      dispatch({ type: 'set', ontology: parseOntology(json) })
      setSelectedId(null)
    } catch (e) {
      alert(`导入失败: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <>
      <div className="topbar">
        <h1>Ontology Studio</h1>
        <input
          className="name"
          value={ontology.name}
          onChange={(e) => dispatch({ type: 'rename', name: e.target.value })}
        />
        {errorCount > 0 ? (
          <span className="badge error">{errorCount} 个校验错误</span>
        ) : (
          <span className="badge ok">校验通过</span>
        )}
        <div className="spacer" />
        <button className="ghost" onClick={importOntology}>
          导入
        </button>
        <button className="ghost" onClick={() => void bridge.exportFile(stringifyOntology(ontology))}>
          导出
        </button>
        <button
          className="ghost"
          onClick={() => {
            dispatch({ type: 'set', ontology: sampleOntology() })
            setSelectedId(null)
          }}
        >
          载入示例
        </button>
        <button
          className="danger"
          onClick={() => {
            dispatch({ type: 'set', ontology: emptyOntology() })
            setSelectedId(null)
          }}
        >
          清空
        </button>
      </div>
      <div className="layout">
        <nav className="sidebar">
          {KINDS.map((k) => (
            <button
              key={k}
              className={section === k ? 'active' : undefined}
              onClick={() => {
                setSection(k)
                setSelectedId(null)
              }}
            >
              {KIND_LABELS[k]}
              <span className="count">{ontology[KIND_FIELD[k]].length}</span>
            </button>
          ))}
          <button
            className={section === 'instances' ? 'active' : undefined}
            onClick={() => setSection('instances')}
          >
            样本实例
            <span className="count">{ontology.sampleInstances.length}</span>
          </button>
          <button
            className={section === 'testing' ? 'active' : undefined}
            onClick={() => setSection('testing')}
          >
            测试与校验
          </button>
        </nav>
        <div className="content">
          {section === 'testing' ? (
            <TestPanel o={ontology} />
          ) : section === 'instances' ? (
            <InstancesPanel
              o={ontology}
              onUpsert={(s) => dispatch({ type: 'upsertInstance', instance: s })}
              onRemove={(id) => dispatch({ type: 'removeInstance', id })}
            />
          ) : (
            <>
              <div className="list-pane">
                <p>
                  <button
                    className="primary"
                    onClick={() => {
                      const e = newEntity(section, ontology)
                      dispatch({ type: 'upsert', entity: e })
                      setSelectedId(e.id)
                    }}
                  >
                    + 新建{KIND_LABELS[section]}
                  </button>
                </p>
                {entities.map((e) => (
                  <div
                    key={e.id}
                    className={`item ${e.id === selectedId ? 'selected' : ''}`}
                    onClick={() => setSelectedId(e.id)}
                  >
                    <div>{e.displayName}</div>
                    <div className="api">{e.apiName}</div>
                  </div>
                ))}
                {entities.length === 0 && <div className="empty">暂无{KIND_LABELS[section]}</div>}
              </div>
              <div className="editor-pane">
                {selected === null ? (
                  <div className="empty">从左侧选择或新建一个{KIND_LABELS[section]}</div>
                ) : (
                  <>
                    <EntityEditor
                      o={ontology}
                      entity={selected}
                      onChange={(e) => dispatch({ type: 'upsert', entity: e })}
                    />
                    <p>
                      <button
                        className="danger"
                        onClick={() => {
                          dispatch({ type: 'remove', kind: selected.kind, id: selected.id })
                          setSelectedId(null)
                        }}
                      >
                        删除此{KIND_LABELS[selected.kind]}
                      </button>
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
