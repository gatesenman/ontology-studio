import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

describe('editor keyboard access', () => {
  it('gives buttons, fields, and list items a :focus-visible ring', () => {
    const css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8')
    expect(css).toMatch(/:focus-visible/)
    expect(css).toMatch(/button:focus-visible/)
    expect(css).toMatch(/input:focus-visible/)
    expect(css).toMatch(/\.list-pane \.item:focus-visible/)
  })

  it('renders ontology list entries as buttons so they are in the tab order', () => {
    const source = fs.readFileSync(path.join(root, 'src/ui/App.tsx'), 'utf8')
    expect(source).toMatch(/<button\s+type="button"[\s\S]*className=\{`item /)
    expect(source).not.toMatch(/<div\s+key=\{e\.id\}\s+className=\{`item /)
  })
})
