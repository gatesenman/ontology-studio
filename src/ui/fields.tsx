/** Small controlled form-field helpers shared by every editor. */
import type { ReactNode } from 'react'

export function TextField(props: {
  label: string
  value: string
  onChange: (v: string) => void
  mono?: boolean
}) {
  return (
    <div className="field">
      <label>{props.label}</label>
      <input
        type="text"
        className={props.mono ? 'mono' : undefined}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  )
}

export function TextArea(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label>{props.label}</label>
      <textarea value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    </div>
  )
}

export function SelectField(props: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="field">
      <label>{props.label}</label>
      <select value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function NumberField(props: {
  label: string
  value: number | undefined
  onChange: (v: number | undefined) => void
}) {
  return (
    <div className="field inline">
      <label>{props.label}</label>
      <input
        type="number"
        value={props.value ?? ''}
        onChange={(e) => props.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      />
    </div>
  )
}

export function Row(props: { children: ReactNode }) {
  return <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>{props.children}</div>
}
