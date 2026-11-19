import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { isAllowedExternalUrl } = require('../electron/security.cjs') as {
  isAllowedExternalUrl: (url: string) => boolean
}

describe('external URL allowlist', () => {
  it('allows https GitHub URLs and loopback http', () => {
    expect(isAllowedExternalUrl('https://github.com/gatesenman/ontology-studio')).toBe(true)
    expect(isAllowedExternalUrl('https://www.github.com/gatesenman/ontology-studio')).toBe(true)
    expect(isAllowedExternalUrl('http://127.0.0.1:5173')).toBe(true)
    expect(isAllowedExternalUrl('http://localhost:5173/')).toBe(true)
  })

  it('rejects unexpected schemes and hosts', () => {
    expect(isAllowedExternalUrl('https://evil.example/phishing')).toBe(false)
    expect(isAllowedExternalUrl('http://example.com')).toBe(false)
    expect(isAllowedExternalUrl('https://github.com.evil.example')).toBe(false)
    expect(isAllowedExternalUrl('file:///etc/passwd')).toBe(false)
    expect(isAllowedExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedExternalUrl('not a url')).toBe(false)
  })
})
