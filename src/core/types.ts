/** Ontology domain model: the eight semantic concept kinds and their shared fields. */

/** Primitive base types a value can take. */
export type BaseType =
  | 'string'
  | 'integer'
  | 'double'
  | 'boolean'
  | 'date'
  | 'timestamp'
  | 'geopoint'

export const BASE_TYPES: readonly BaseType[] = [
  'string',
  'integer',
  'double',
  'boolean',
  'date',
  'timestamp',
  'geopoint',
]

/** Fields shared by every ontology entity. */
export interface EntityBase {
  id: string
  /** Stable machine identifier: lowerCamelCase, unique per kind. */
  apiName: string
  displayName: string
  description: string
}

/** Reusable, constrained semantic type over a base type. */
export interface ValueType extends EntityBase {
  kind: 'valueType'
  baseType: BaseType
  /** Optional regex constraint applied to string values. */
  pattern?: string
  /** Optional inclusive numeric bounds. */
  min?: number
  max?: number
  /** Optional closed enumeration of allowed values. */
  enumValues?: string[]
}

/** A property on an object type. Either a base type or a value type reference. */
export interface PropertyDef {
  apiName: string
  displayName: string
  description: string
  baseType: BaseType
  /** When set, the property is constrained by the referenced value type. */
  valueTypeId?: string
  required: boolean
  array: boolean
}

/** A modeled real-world entity class with typed properties. */
export interface ObjectType extends EntityBase {
  kind: 'objectType'
  properties: PropertyDef[]
  /** apiName of the property that uniquely identifies instances. */
  primaryKey: string
  /** apiName of the property used as instance title. */
  titleProperty: string
}

export type Cardinality = 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY'

/** A typed relationship between two object types. */
export interface LinkType extends EntityBase {
  kind: 'linkType'
  sourceObjectTypeId: string
  targetObjectTypeId: string
  cardinality: Cardinality
}

export type ModificationOp = 'create' | 'modify' | 'delete'

/** A parameter accepted by an action. */
export interface ParameterDef {
  apiName: string
  displayName: string
  baseType: BaseType
  required: boolean
}

/** A user-invocable action that modifies object instances, with guard rules. */
export interface ActionType extends EntityBase {
  kind: 'actionType'
  parameters: ParameterDef[]
  modifies: { objectTypeId: string; operation: ModificationOp }[]
  /** Rule ids that must pass before the action may be submitted. */
  submissionCriteria: string[]
}

export type Aggregation = 'count' | 'sum' | 'avg' | 'min' | 'max'

/** An aggregated measure over instances of one object type. */
export interface Metric extends EntityBase {
  kind: 'metric'
  objectTypeId: string
  aggregation: Aggregation
  /** Property aggregated over; unused for `count`. */
  propertyApiName?: string
  /** Optional boolean filter expression over instance properties. */
  filter?: string
}

export type RuleSeverity = 'error' | 'warning'

/** A boolean invariant over instances of one object type. */
export interface Rule extends EntityBase {
  kind: 'rule'
  objectTypeId: string
  /** Boolean expression over instance properties; instances failing it violate the rule. */
  expression: string
  severity: RuleSeverity
}

export type OntologyEntity =
  | ValueType
  | ObjectType
  | LinkType
  | ActionType
  | Metric
  | Rule

export type EntityKind = OntologyEntity['kind']

/** A sample object instance used by the testing panel. */
export interface SampleInstance {
  id: string
  objectTypeId: string
  values: Record<string, unknown>
}

/** The complete ontology document persisted to disk. */
export interface Ontology {
  formatVersion: 1
  name: string
  valueTypes: ValueType[]
  objectTypes: ObjectType[]
  linkTypes: LinkType[]
  actionTypes: ActionType[]
  metrics: Metric[]
  rules: Rule[]
  sampleInstances: SampleInstance[]
}

/** Creates an empty ontology document. */
export function emptyOntology(name = 'Untitled Ontology'): Ontology {
  return {
    formatVersion: 1,
    name,
    valueTypes: [],
    objectTypes: [],
    linkTypes: [],
    actionTypes: [],
    metrics: [],
    rules: [],
    sampleInstances: [],
  }
}
