// Electron main process: window lifecycle plus file persistence IPC.
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { isAllowedExternalUrl } = require('./security.cjs')

const DEV_URL = process.env.ONTOLOGY_STUDIO_DEV_URL || 'http://localhost:5173'
const isDev = !app.isPackaged && process.env.ONTOLOGY_STUDIO_PROD !== '1'

function autosavePath() {
  return path.join(app.getPath('userData'), 'ontology.json')
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    title: 'Ontology Studio',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })
  attachNavigationGuards(win)
  if (isDev) {
    win.loadURL(DEV_URL)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

function isAppNavigation(url) {
  if (url.startsWith('file:')) return true
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') && (parsed.port === '5173' || url.startsWith(DEV_URL))) {
      return true
    }
  } catch {
    return false
  }
  return false
}

function attachNavigationGuards(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      setImmediate(() => {
        void shell.openExternal(url)
      })
    }
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (isAppNavigation(url)) return
    event.preventDefault()
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url)
    }
  })
}

app.whenReady().then(() => {
  ipcMain.handle('ontology:load', () => {
    try {
      return fs.readFileSync(autosavePath(), 'utf8')
    } catch {
      return null
    }
  })
  ipcMain.handle('ontology:save', (_event, json) => {
    fs.mkdirSync(path.dirname(autosavePath()), { recursive: true })
    fs.writeFileSync(autosavePath(), json, 'utf8')
    return true
  })
  ipcMain.handle('ontology:export', async (_event, json) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export ontology',
      defaultPath: 'ontology.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (canceled || !filePath) return false
    fs.writeFileSync(filePath, json, 'utf8')
    return true
  })
  ipcMain.handle('ontology:import', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import ontology',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (canceled || filePaths.length === 0) return null
    return fs.readFileSync(filePaths[0], 'utf8')
  })
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
