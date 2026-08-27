/** Renderer-side persistence bridge: Electron IPC when available, localStorage in the browser. */

interface OntologyBridge {
  load(): Promise<string | null>
  save(json: string): Promise<boolean>
  exportFile(json: string): Promise<boolean>
  importFile(): Promise<string | null>
}

declare global {
  interface Window {
    ontologyBridge?: OntologyBridge
  }
}

const STORAGE_KEY = 'ontology-studio-document'

/** Persistence backend for the current runtime (Electron or plain browser). */
export const bridge: OntologyBridge = window.ontologyBridge ?? {
  load: async () => localStorage.getItem(STORAGE_KEY),
  save: async (json) => {
    localStorage.setItem(STORAGE_KEY, json)
    return true
  },
  exportFile: async (json) => {
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'ontology.json'
    a.click()
    URL.revokeObjectURL(a.href)
    return true
  },
  importFile: () =>
    new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json,application/json'
      input.onchange = async () => {
        const file = input.files?.[0]
        resolve(file ? await file.text() : null)
      }
      input.click()
    }),
}
