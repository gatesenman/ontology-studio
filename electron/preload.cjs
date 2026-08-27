// Preload: exposes the persistence bridge to the renderer.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ontologyBridge', {
  load: () => ipcRenderer.invoke('ontology:load'),
  save: (json) => ipcRenderer.invoke('ontology:save', json),
  exportFile: (json) => ipcRenderer.invoke('ontology:export', json),
  importFile: () => ipcRenderer.invoke('ontology:import'),
})
