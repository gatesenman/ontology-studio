/** Ontology document (de)serialization with format checking at the file boundary. */
import { emptyOntology, type Ontology } from './types.ts'

const ARRAY_FIELDS = [
  'valueTypes',
  'objectTypes',
  'linkTypes',
  'actionTypes',
  'metrics',
  'rules',
  'sampleInstances',
] as const

/**
 * Parses an ontology JSON document, rejecting unknown formats.
 * @param json raw file contents
 * @returns the parsed ontology
 * @throws Error when the document is not a formatVersion-1 ontology
 */
export function parseOntology(json: string): Ontology {
  const raw: unknown = JSON.parse(json)
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('文档必须是 JSON 对象')
  }
  const doc = raw as Record<string, unknown>
  if (doc.formatVersion !== 1) {
    throw new Error(`不支持的 formatVersion: ${String(doc.formatVersion)}`)
  }
  const base = emptyOntology(typeof doc.name === 'string' ? doc.name : 'Untitled Ontology')
  for (const field of ARRAY_FIELDS) {
    const value = doc[field]
    if (value !== undefined && !Array.isArray(value)) {
      throw new Error(`字段 ${field} 必须是数组`)
    }
    if (Array.isArray(value)) {
      ;(base[field] as unknown[]) = value
    }
  }
  return base
}

/**
 * Serializes an ontology to pretty-printed JSON.
 * @param o ontology to serialize
 * @returns JSON text ending in one newline
 */
export function stringifyOntology(o: Ontology): string {
  return JSON.stringify(o, null, 2) + '\n'
}
