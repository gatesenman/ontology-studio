'use strict'

// Allowlist for shell.openExternal: published GitHub pages and local dev servers.
function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
}

function isAllowedExternalUrl(url) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:') {
      return parsed.hostname === 'github.com' || parsed.hostname === 'www.github.com'
    }
    if (parsed.protocol === 'http:') {
      return isLoopbackHost(parsed.hostname)
    }
    return false
  } catch {
    return false
  }
}

module.exports = { isAllowedExternalUrl }
