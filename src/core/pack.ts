import type { Ontology } from './types.ts'
import { validateOntology, type ValidationIssue } from './validate.ts'
import { checkInstances, type TypeCheckResult } from './testing.ts'

export const ONTOLOGY_PACK_KIND = 'ontology-pack'
export const ONTOLOGY_PACK_VERSION = 1

export interface OntologyTestReport {
  name: string
  valid: boolean
  issues: ValidationIssue[]
  instances: TypeCheckResult[]
}

export interface OntologyPack {
  kind: typeof ONTOLOGY_PACK_KIND
  version: number
  ontology: Ontology
  report: OntologyTestReport
}

export function buildTestReport(ontology: Ontology): OntologyTestReport {
  const issues = validateOntology(ontology)
  const instances = checkInstances(ontology)
  const instanceProblems = instances.some((row) => row.problems.length > 0)
  return {
    name: ontology.name,
    valid: issues.length === 0 && !instanceProblems,
    issues,
    instances,
  }
}

export function reportToMarkdown(report: OntologyTestReport): string {
  const lines = [
    `# Ontology test report: ${report.name}`,
    '',
    `Result: ${report.valid ? 'valid' : 'invalid'}`,
    `Issues: ${report.issues.length}`,
    '',
  ]
  for (const issue of report.issues) {
    lines.push(`- [${issue.severity}] ${issue.entityName || issue.entityId}: ${issue.message}`)
  }
  for (const inst of report.instances) {
    if (inst.problems.length === 0) continue
    lines.push(`- instance ${inst.instanceId} (${inst.objectTypeName}): ${inst.problems.join('; ')}`)
  }
  lines.push('')
  return lines.join('\n')
}

export function exportPack(ontology: Ontology): string {
  const pack: OntologyPack = {
    kind: ONTOLOGY_PACK_KIND,
    version: ONTOLOGY_PACK_VERSION,
    ontology,
    report: buildTestReport(ontology),
  }
  return JSON.stringify(pack, null, 2) + '\n'
}

export function importPack(text: string): OntologyPack {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (e) {
    throw new Error(`Invalid ontology pack: ${(e as Error).message}`)
  }
  if (!raw || typeof raw !== 'object') throw new Error('Invalid ontology pack: expected an object')
  const obj = raw as Record<string, unknown>
  if (obj.kind !== ONTOLOGY_PACK_KIND) throw new Error('Invalid ontology pack: unexpected kind')
  if (obj.version !== ONTOLOGY_PACK_VERSION) throw new Error('Invalid ontology pack: unsupported version')
  if (!obj.ontology || typeof obj.ontology !== 'object') throw new Error('Invalid ontology pack: missing ontology')
  const ontology = obj.ontology as Ontology
  const report = buildTestReport(ontology)
  return { kind: ONTOLOGY_PACK_KIND, version: ONTOLOGY_PACK_VERSION, ontology, report }
}
