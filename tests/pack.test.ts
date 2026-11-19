import { describe, expect, it } from 'vitest'
import { exportPack, importPack, buildTestReport, reportToMarkdown } from '../src/core/pack.ts'
import { sampleOntology } from '../src/core/sample.ts'

describe('ontology pack', () => {
  it('round-trips the shipping logistics sample and writes a passing report', () => {
    const source = sampleOntology()
    const text = exportPack(source)
    const pack = importPack(text)
    expect(pack.kind).toBe('ontology-pack')
    expect(pack.ontology.name).toBe(source.name)
    expect(pack.ontology.objectTypes.map((t) => t.apiName)).toEqual(
      source.objectTypes.map((t) => t.apiName),
    )
    expect(pack.report.valid).toBe(true)
    const md = reportToMarkdown(pack.report)
    expect(md).toContain('Logistics')
    expect(md).toContain('valid')
  })

  it('rejects a pack with the wrong kind', () => {
    expect(() => importPack('{"kind":"nope","version":1,"ontology":{}}')).toThrow(/unexpected kind/)
    expect(() => importPack('not-json')).toThrow(/Invalid ontology pack/)
  })

  it('reports invalid ontologies in the test-report file', () => {
    const broken = sampleOntology()
    broken.objectTypes[0].apiName = 'Bad-Name'
    const report = buildTestReport(broken)
    expect(report.valid).toBe(false)
    expect(reportToMarkdown(report)).toContain('invalid')
  })
})
