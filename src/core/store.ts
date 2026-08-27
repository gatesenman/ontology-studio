/** Reducer-based ontology store shared by the UI and tests. */
import type { EntityKind, Ontology, OntologyEntity, SampleInstance } from './types.ts'

/** Maps an entity kind to its array field on the ontology document. */
export const KIND_FIELD = {
  valueType: 'valueTypes',
  objectType: 'objectTypes',
  linkType: 'linkTypes',
  actionType: 'actionTypes',
  metric: 'metrics',
  rule: 'rules',
} as const satisfies Record<EntityKind, keyof Ontology>

export type OntologyAction =
  | { type: 'set'; ontology: Ontology }
  | { type: 'rename'; name: string }
  | { type: 'upsert'; entity: OntologyEntity }
  | { type: 'remove'; kind: EntityKind; id: string }
  | { type: 'upsertInstance'; instance: SampleInstance }
  | { type: 'removeInstance'; id: string }

/**
 * Applies one action to the ontology document.
 * @param state current ontology
 * @param action mutation to apply
 * @returns the next ontology (input is never mutated)
 */
export function ontologyReducer(state: Ontology, action: OntologyAction): Ontology {
  switch (action.type) {
    case 'set':
      return action.ontology
    case 'rename':
      return { ...state, name: action.name }
    case 'upsert': {
      const field = KIND_FIELD[action.entity.kind]
      const list = state[field] as OntologyEntity[]
      const idx = list.findIndex((e) => e.id === action.entity.id)
      const next = idx === -1 ? [...list, action.entity] : list.with(idx, action.entity)
      return { ...state, [field]: next }
    }
    case 'remove': {
      const field = KIND_FIELD[action.kind]
      const list = state[field] as OntologyEntity[]
      return { ...state, [field]: list.filter((e) => e.id !== action.id) }
    }
    case 'upsertInstance': {
      const idx = state.sampleInstances.findIndex((s) => s.id === action.instance.id)
      const next =
        idx === -1
          ? [...state.sampleInstances, action.instance]
          : state.sampleInstances.with(idx, action.instance)
      return { ...state, sampleInstances: next }
    }
    case 'removeInstance':
      return {
        ...state,
        sampleInstances: state.sampleInstances.filter((s) => s.id !== action.id),
      }
  }
}

let counter = 0

/**
 * Generates a unique entity id.
 * @param prefix short kind prefix (e.g. `ot`)
 * @returns a collision-resistant id
 */
export function newId(prefix: string): string {
  counter++
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}
